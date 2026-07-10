import handler from "../api/stitch.js";

const req = {
  method: "POST",
  body: {
    videoUrls: [
      "https://v3b.fal.media/files/b/0aa16534/Bxgrv_x6YWCdxASn-_EUv_output.mp4",
      "https://v3b.fal.media/files/b/0aa16546/wAe8X2Fig4L8pWpEsZ35__output.mp4",
    ],
  },
};
function makeRes() {
  return {
    _status: 200,
    status(c) { this._status = c; return this; },
    json(o) { console.log(`[response] status=${this._status}`, JSON.stringify(o, null, 2)); return o; },
  };
}
await handler(req, makeRes());
