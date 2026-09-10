/**
 * Copyright © 2023-2026 Blockchain Commons, LLC
 * Copyright © 2025-2026 Parity Technologies
 *
 */

/**
 * A class that takes a block of data and returns its bits singularly or in clusters.
 */
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

  nextUint2(): number {
    let bitMask = 0x02;
    let value = 0;
    for (let i = 0; i < 2; i++) {
      if (this.next()) {
        value |= bitMask;
      }
      bitMask >>= 1;
    }
    return value;
  }

  nextUint8(): number {
    let bitMask = 0x80;
    let value = 0;
    for (let i = 0; i < 8; i++) {
      if (this.next()) {
        value |= bitMask;
      }
      bitMask >>= 1;
    }
    return value;
  }

  nextUint16(): number {
    let bitMask = 0x8000;
    let value = 0;
    for (let i = 0; i < 16; i++) {
      if (this.next()) {
        value |= bitMask;
      }
      bitMask >>= 1;
    }
    return value;
  }

  nextFrac(): number {
    return this.nextUint16() / 65535.0;
  }
}

/**
 * A class that accumulates bits fed into it and returns a block of data containing those bits.
 */
