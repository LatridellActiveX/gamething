export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === "/health") {
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }

    return env.ASSETS.fetch(request);
  },
};
