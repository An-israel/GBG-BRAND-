declare module 'heic-convert' {
  const convert: (opts: { buffer: Buffer | ArrayBuffer; format: 'JPEG' | 'PNG'; quality?: number }) => Promise<ArrayBuffer>;
  export default convert;
}
