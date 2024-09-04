export async function GET(req) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  const nostrData = {
    names: {
      dread: "00000001fc52245d2da96009b6827e896d583ee5189ae26509df7ec51e5eed21"
    }
  };

  return new Response(JSON.stringify(nostrData), {
    headers: headers,
    status: 200
  });
}

export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new Response(null, {
    headers: headers,
    status: 200
  });
}
