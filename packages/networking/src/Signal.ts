export class Signal {
  session: RTCSessionDescriptionInit;
  publicKey?: string;

  constructor(
    session: RTCSessionDescriptionInit,
    publicKey?: string
  ) {
    this.session = session;
    this.publicKey = publicKey;
  }

  // Key aliasing for smaller JSON
  private toAliased(): any {
    return {
      k: this.publicKey,
      s: {
        t: this.session.type,
        d: this.session.sdp
      }
    };
  }

  private static fromAliased(data: any): Signal {
    return new Signal(
      { type: data.s.t, sdp: data.s.d },
      data.k
    );
  }

  async serialize(): Promise<string> {
    const json = JSON.stringify(this.toAliased());
    const stream = new Blob([json]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const response = new Response(compressedStream);
    const buffer = await response.arrayBuffer();
    
    // URL-safe Base64
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  static async decompress(content: string): Promise<Signal> {
    try {
      // Handle both old Base64 and new URL-safe Base64
      const base64 = content.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
      const response = new Response(decompressedStream);
      const json = await response.text();
      const data = JSON.parse(json);
      
      // Check if it's aliased
      if (data.s) {
        return this.fromAliased(data);
      }
      return new Signal(data.session, data.publicKey);
    } catch (e) {
      throw new Error("Failed to decompress or parse signal");
    }
  }
}
