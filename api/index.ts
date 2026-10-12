import serverless from "serverless-http";
import { getApp } from "../server.ts";

let handler: any;

export default async function handlerFn(req: any, res: any) {
  if (!handler) {
    const app = await getApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
