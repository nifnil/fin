import express from 'express';
import { registerApiRoutes } from './router';

const PORT = process.env.SERVER_PORT || 3000;
const app = express();
app.use(express.json());

registerApiRoutes(app);

app.listen(PORT, () => {
  console.warn(`Dev server running at http://localhost:${PORT}`);
});