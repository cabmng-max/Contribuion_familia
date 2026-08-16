export default {
  async fetch(request, env, ctx) {
    return new Response(
      "MNG e-Familia - Service de contribution actif",
      {
        headers: {
          "content-type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
