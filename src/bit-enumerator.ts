/** Reads a byte array as a stream of bits, most significant bit first. */
export class BitEnumerator {
  private index = 0;
  private mask = 0x80;

  constructor(private readonly data: Uint8Array) {}

  hasNext(): boolean {
    return this.mask !== 0 || this.index !== this.data.length - 1;
  }

  next(): boolean {
    if (!this.hasNext()) {
      throw new Error("BitEnumerator underflow");
    }

    if (this.mask === 0) {
      this.mask = 0x80;
      this.index++;
    }

    const b = (this.data[this.index] & this.mask) !== 0;

    this.mask >>= 1;

    return b;
  }

  private nextBits(count: number): number {
    let bitMask = 1 << (count - 1);
    let value = 0;
    for (let i = 0; i < count; i++) {
      if (this.next()) {
        value |= bitMask;
      }
      bitMask >>= 1;
    }
    return value;
  }

  nextUint2(): number {
    return this.nextBits(2);
  }

  nextUint8(): number {
    return this.nextBits(8);
  }

  nextUint16(): number {
    return this.nextBits(16);
  }

  /** Sixteen bits as a fraction in [0, 1]. */
  nextFrac(): number {
    return this.nextUint16() / 65535.0;
  }
}
