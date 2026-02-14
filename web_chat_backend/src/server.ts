import { createServer } from "http";
import { app } from "./app";
import { initSocket } from "./utils/socket";

const port = Number(process.env.PORT ?? 4000);
const server = createServer(app);
initSocket(server);

server.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
