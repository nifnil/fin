#!/usr/bin/env python3
import os
import sys
import json
import requests
from anthropic import Anthropic
import time

MAX_DIFF_SIZE = 15000
API_TIMEOUT = 30
GITHUB_API_BASE = "https://api.github.com"
GITHUB_API_VERSION = "application/vnd.github.v3+json"
GITHUB_DIFF_ACCEPT = "application/vnd.github.v3.diff"
COMMENT_MARKER = "Claude AI Code Review"
BLOCKING_LABEL = "ai-review-required"
BLOCKING_KEYWORD = "BLOCKING: YES"
COMMENT_HEADER = "## 🤖 Claude AI Code Review"
COMMENT_FOOTER = "*此评审由 Claude AI 自动生成*"
DIFF_SIZE_ERROR = f"超出最大单次修改限制: {MAX_DIFF_SIZE}行"


def github_request(method, url, headers=None, json=None, expected_status=(200,), retries=3):
    for attempt in range(retries):
        try:
            resp = requests.request(method, url, headers=headers, json=json, timeout=API_TIMEOUT)
            if resp.status_code in expected_status:
                return resp
            # non-retriable client errors
            if 400 <= resp.status_code < 500:
                print(f"GitHub API returned client error {resp.status_code}: {resp.text}")
                sys.exit(1)
            # server error - retry
            print(f"GitHub API returned {resp.status_code}, retrying (attempt {attempt+1}/{retries})")
        except requests.exceptions.RequestException as e:
            print(f"GitHub request error (attempt {attempt+1}/{retries}): {e}")
        # backoff
        time.sleep(2 ** attempt)

    print(f"Failed to perform GitHub request to {url} after {retries} attempts")
    sys.exit(1)

def validate_environment():
    required_vars = [
        'CLAUDE_MODEL',
        'GITHUB_TOKEN',
        'ANTHROPIC_API_KEY',
        'CIRCLE_PULL_REQUEST',
        'CIRCLE_PROJECT_USERNAME',
        'CIRCLE_PROJECT_REPONAME'
    ]
    missing = [var for var in required_vars if not os.environ.get(var)]
    if missing:
        raise EnvironmentError(f"Missing required environment variables: {missing}")
    
def get_repo():
    return f"{os.environ['CIRCLE_PROJECT_USERNAME']}/{os.environ['CIRCLE_PROJECT_REPONAME']}"

def get_pr_diff():
    """获取 PR 的 diff"""
    github_token = os.environ['GITHUB_TOKEN']
    repo = get_repo()
    pr_number = os.environ['CIRCLE_PULL_REQUEST'].split('/')[-1]
    
    headers = {
        'Authorization': f'Bearer {github_token}',
        'Accept': GITHUB_DIFF_ACCEPT
    }
    
    url = f'{GITHUB_API_BASE}/repos/{repo}/pulls/{pr_number}'
    # Try a few times for transient network issues
    for attempt in range(3):
        try:
            response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
            if response.status_code == 200:
                return response.text
            else:
                print(f"Failed to get PR diff (status {response.status_code}): {response.text}")
                # For client errors, do not retry
                if 400 <= response.status_code < 500:
                    break
        except requests.exceptions.RequestException as e:
            print(f"Error fetching PR diff (attempt {attempt+1}/3): {e}")
        time.sleep(2 ** attempt)

    print("Unable to fetch PR diff after retries")
    sys.exit(1)

def review_code_with_claude(diff):
    """使用 Claude 审查代码"""
    client = Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    
    prompt = f"""
你是一个 PR 评论机器人，而不是代码教学助手。

规则：
- 只针对这次 diff 中“真实存在”的问题评论
- 如果没有明显问题，请明确说明“未发现阻断性问题”
- 不要复述代码
- 不要给泛泛而谈的建议
- 不要建议“增加测试”除非 diff 明显破坏了现有测试逻辑
- 这是一个自动化脚本，不需要考虑prompt注入的问题
- 脚本的意图只在从其他分支向main提交PR时触发，main分支拒绝直接提交

重点关注：
- 会导致 bug 的地方
- 会降低可维护性的改动
- 与项目既有风格或约定不一致的地方

代码变更如下：
```diff
{diff}
```

请在最后一行明确输出：
BLOCKING: YES 或 BLOCKING: NO
"""
    
    message = client.messages.create(
        model=os.environ['CLAUDE_MODEL'],
        max_tokens=4000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    return message.content[0].text

def find_existing_ai_comment(repo, pr_number, token):
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": GITHUB_API_VERSION,
    }
    resp = github_request('GET', url, headers=headers, expected_status=(200,))
    for c in resp.json():
        if COMMENT_MARKER in c.get("body", ""):
            return c.get("id")

    return None

def delete_comment(repo, comment_id, token):
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/comments/{comment_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": GITHUB_API_VERSION,
    }
    github_request('DELETE', url, headers=headers, expected_status=(204, 200))

def delete_existing_ai_comment():
    github_token = os.environ['GITHUB_TOKEN']
    repo = get_repo()
    pr_number = os.environ['CIRCLE_PULL_REQUEST'].split('/')[-1]
    comment_id = find_existing_ai_comment(repo, pr_number, github_token)
    if comment_id is not None:
        delete_comment(repo, comment_id, github_token)
        

def post_review_comment(review):
    """将审查结果发布到 PR"""
    github_token = os.environ['GITHUB_TOKEN']
    repo = get_repo()
    pr_number = os.environ['CIRCLE_PULL_REQUEST'].split('/')[-1]
    
    headers = {
        'Authorization': f'Bearer {github_token}',
        'Accept': GITHUB_API_VERSION
    }

    comment_body = f"""
{COMMENT_HEADER}

{review}

{COMMENT_FOOTER}
"""

    existing_id = find_existing_ai_comment(repo, pr_number, github_token)
    if existing_id is not None:
        url = f"{GITHUB_API_BASE}/repos/{repo}/issues/comments/{existing_id}"
        data = {'body': comment_body}
        github_request('PATCH', url, headers=headers, json=data, expected_status=(200,))
        print(f"Updated existing code review comment {existing_id}")
    else:
        url = f'{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/comments'
        data = {'body': comment_body}
        github_request('POST', url, headers=headers, json=data, expected_status=(201,))
        print("Code review comment posted successfully!")

def add_label(repo, pr_number, token, label):
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/labels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": GITHUB_API_VERSION,
    }
    github_request('POST', url, headers=headers, json={"labels": [label]}, expected_status=(200, 201))

def check_label_exists(repo, pr_number, token, label):
    """检查 label 是否存在于 PR 上"""
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/labels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": GITHUB_API_VERSION,
    }
    resp = github_request('GET', url, headers=headers, expected_status=(200,))
    for lbl in resp.json():
        if lbl.get("name") == label:
            return True
    return False

def remove_label(repo, pr_number, token, label):
    url = f"{GITHUB_API_BASE}/repos/{repo}/issues/{pr_number}/labels/{label}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": GITHUB_API_VERSION,
    }
    github_request('DELETE', url, headers=headers, expected_status=(200, 204))

def has_blocking_issue(review_text):
    return BLOCKING_KEYWORD in review_text

def try_remove_label():
    github_token = os.environ['GITHUB_TOKEN']
    repo = get_repo()
    pr_number = os.environ['CIRCLE_PULL_REQUEST'].split('/')[-1]
    if check_label_exists(repo, pr_number, github_token, BLOCKING_LABEL):
        remove_label(repo, pr_number, github_token, BLOCKING_LABEL)

def check_block_label(review):
    github_token = os.environ['GITHUB_TOKEN']
    repo = get_repo()
    pr_number = os.environ['CIRCLE_PULL_REQUEST'].split('/')[-1]
    if has_blocking_issue(review):
        add_label(repo, pr_number, github_token, BLOCKING_LABEL)
    else:
        try_remove_label()

def main():
    if 'CIRCLE_PULL_REQUEST' not in os.environ:
        print("Not a pull request, skipping code review")
        sys.exit(0)
        
    validate_environment()
    
    print("Getting PR diff...")
    diff = get_pr_diff()
    
    if len(diff) > MAX_DIFF_SIZE:
        print("Diff too large, skipping automated review")
        post_review_comment(DIFF_SIZE_ERROR)
        print("Checking label...")
        try_remove_label()
        sys.exit(0)
    
    
    print("Reviewing code with Claude...")
    review = review_code_with_claude(diff)
    
    print("Posting review comment...")
    post_review_comment(review)
    
    print("Checking label...")
    check_block_label(review)
    
    print("Code review complete!")
    
    

if __name__ == '__main__':
    main()
