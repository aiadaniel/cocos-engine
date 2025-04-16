
const ieee754 = {
  read: function (buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  },
  write: function (buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}
    e = e << mLen | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}
    buffer[offset + i - d] |= s * 128;
  }
};

// exports.Buffer = _Buffer;

const K_MAX_LENGTH = 0x7fffffff;
function createBuffer(length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError(length + ' createBuffer');
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length);
  Object.setPrototypeOf(buf, _Buffer.prototype);
  return buf;
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function _Buffer(arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError('Received type number');
    }
    return allocUnsafe(arg);
  }
  return from(arg, encodingOrOffset, length);
}

// Buffer.poolSize = 8192 // not used by this implementation

function from(value, encodingOrOffset, length) {
  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value);
  }
  if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
    return fromArrayBuffer(value, encodingOrOffset, length);
  }
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
_Buffer.from = function (value, encodingOrOffset?, length?) {
  return from(value, encodingOrOffset, length);
};

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
// Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
// Object.setPrototypeOf(Buffer, Uint8Array)

// function alloc (size, fill, encoding) {
// assertSize(size)
// if (size <= 0) {
//   return createBuffer(size)
// }
// if (fill !== undefined) {
//   // Only pay attention to encoding if it's a string. This
//   // prevents accidentally sending in a number that would
//   // be interpreted as a start offset.
//   return typeof encoding === 'string'
//     ? createBuffer(size).fill(fill, encoding)
//     : createBuffer(size).fill(fill)
// }
//   return createBuffer(size)
// }

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
// Buffer.alloc = function (size, fill, encoding) {
//   return alloc(size, fill, encoding)
// }

function allocUnsafe(size) {
  // assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0);
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
_Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size);
};
function fromArrayLike(array) {
  const length = array.length <= 0 ? 0 : checked(array.length) | 0;
  const buf = createBuffer(length);
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255;
  }
  return buf;
}
function fromArrayView(arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView);
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
  }
  return fromArrayLike(arrayView);
}
function fromArrayBuffer(array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('offset outside bounds');
  }
  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('length outside bounds');
  }
  let buf;
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array);
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset);
  } else {
    buf = new Uint8Array(array, byteOffset, length);
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, _Buffer.prototype);
  return buf;
}
function checked(length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes');
  }
  return length | 0;
}
_Buffer.isBuffer = function isBuffer(b) {
  return b != null && b._isBuffer === true && b !== _Buffer.prototype; // so Buffer.isBuffer(Buffer.prototype) will be false
};
function byteLength(string, encoding) {
  // if (Buffer.isBuffer(string)) {
  //   return string.length
  // }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength;
  }
  // if (typeof string !== 'string') {
  //   throw new TypeError(
  //     'argument must be type string/Buffer/ArrayBuffer. ' +
  //     'but ' + typeof string
  //   )
  // }
  // return utf8ToBytes(string).length
  throw new TypeError("currently no support");
}
_Buffer.byteLength = byteLength;

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
_Buffer.prototype._isBuffer = true;

// function utf8Write (buf, string, offset, length) {
//   return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
// }

// Buffer.prototype.write = function write (string, offset, length, encoding) {
//   // Buffer#write(string)
//   if (offset === undefined) {
//     // encoding = 'utf8'
//     length = this.length
//     offset = 0
//   // Buffer#write(string, encoding)
//   }
//   // else if (length === undefined && typeof offset === 'string') {
//   //   // encoding = offset
//   //   length = this.length
//   //   offset = 0
//   // // Buffer#write(string, offset[, length][, encoding])
//   // }
//   else if (isFinite(offset)) {
//     offset = offset >>> 0
//     if (isFinite(length)) {
//       length = length >>> 0
//       // if (encoding === undefined) encoding = 'utf8'
//     } else {
//       // encoding = length
//       length = undefined
//     }
//   } else {
//     throw new Error(
//       'Buffer.write(string, encoding, offset[, length]) is no longer supported'
//     )
//   }

//   const remaining = this.length - offset
//   if (length === undefined || length > remaining) length = remaining

//   if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
//     throw new RangeError('Attempt to write outside buffer bounds')
//   }

//   return utf8Write(this, string, offset, length)
// }

_Buffer.prototype.slice = function slice(start, end) {
  const len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;
  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }
  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }
  if (end < start) end = start;
  const newBuf = this.subarray(start, end);
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, _Buffer.prototype);
  return newBuf;
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
_Buffer.prototype.copy = function copy(target, targetStart, start, end) {
  if (!_Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer');
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length === 0 || this.length === 0) return 0;

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds');
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range');
  if (end < 0) throw new RangeError('sourceEnd out of bounds');

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }
  const len = end - start;
  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end);
  } else {
    Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
  }
  return len;
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
// Buffer.prototype.fill = function fill (val, start, end, encoding) {
//   // Handle string cases:
//   if (typeof val === 'string') {
//     // if (typeof start === 'string') {
//     //   encoding = start
//     //   start = 0
//     //   end = this.length
//     // } else if (typeof end === 'string') {
//     //   encoding = end
//     //   end = this.length
//     // }
//     // if (encoding !== undefined && typeof encoding !== 'string') {
//     //   throw new TypeError('encoding must be a string')
//     // }
//     // if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
//     //   throw new TypeError('Unknown encoding: ' + encoding)
//     // }
//     if (val.length === 1) {
//       const code = val.charCodeAt(0)
//       if ((encoding === 'utf8' && code < 128) /*|| encoding === 'latin1' */) {
//         // Fast path: If `val` fits into a single byte, use that numeric value.
//         val = code
//       }
//     }
//   } else if (typeof val === 'number') {
//     val = val & 255
//   } else if (typeof val === 'boolean') {
//     val = Number(val)
//   }

//   // Invalid ranges are not set to a default, so can range check early.
//   if (start < 0 || this.length < start || this.length < end) {
//     throw new RangeError('Out of range index')
//   }

//   if (end <= start) {
//     return this
//   }

//   start = start >>> 0
//   end = end === undefined ? this.length : end >>> 0

//   if (!val) val = 0

//   let i
//   if (typeof val === 'number') {
//     for (i = start; i < end; ++i) {
//       this[i] = val
//     }
//   } else {
//     const bytes = Buffer.isBuffer(val)
//       ? val
//       : Buffer.from(val, encoding)
//     const len = bytes.length
//     if (len === 0) {
//       throw new TypeError('The value "' + val +
//         '" is invalid for argument "value"')
//     }
//     for (i = 0; i < end - start; ++i) {
//       this[i + start] = bytes[i % len]
//     }
//   }

//   return this
// }

// function utf8ToBytes (string, units) {
//   console.log("utf8ToBytes " + string + " ==> " + units);
//   units = units || Infinity
//   let codePoint
//   const length = string.length
//   let leadSurrogate = null
//   const bytes = []

//   for (let i = 0; i < length; ++i) {
//     codePoint = string.charCodeAt(i)

//     // is surrogate component
//     if (codePoint > 0xD7FF && codePoint < 0xE000) {
//       // last char was a lead
//       if (!leadSurrogate) {
//         // no lead yet
//         if (codePoint > 0xDBFF) {
//           // unexpected trail
//           if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
//           continue
//         } else if (i + 1 === length) {
//           // unpaired lead
//           if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
//           continue
//         }

//         // valid lead
//         leadSurrogate = codePoint

//         continue
//       }

//       // 2 leads in a row
//       if (codePoint < 0xDC00) {
//         if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
//         leadSurrogate = codePoint
//         continue
//       }

//       // valid surrogate pair
//       codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
//     } else if (leadSurrogate) {
//       // valid bmp char, but last char was a lead
//       if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
//     }

//     leadSurrogate = null

//     // encode utf8
//     if (codePoint < 0x80) {
//       if ((units -= 1) < 0) break
//       bytes.push(codePoint)
//     } else if (codePoint < 0x800) {
//       if ((units -= 2) < 0) break
//       bytes.push(
//         codePoint >> 0x6 | 0xC0,
//         codePoint & 0x3F | 0x80
//       )
//     } else if (codePoint < 0x10000) {
//       if ((units -= 3) < 0) break
//       bytes.push(
//         codePoint >> 0xC | 0xE0,
//         codePoint >> 0x6 & 0x3F | 0x80,
//         codePoint & 0x3F | 0x80
//       )
//     } else if (codePoint < 0x110000) {
//       if ((units -= 4) < 0) break
//       bytes.push(
//         codePoint >> 0x12 | 0xF0,
//         codePoint >> 0xC & 0x3F | 0x80,
//         codePoint >> 0x6 & 0x3F | 0x80,
//         codePoint & 0x3F | 0x80
//       )
//     } else {
//       throw new Error('Invalid code point')
//     }
//   }

//   return bytes
// }

// function blitBuffer (src, dst, offset, length) {
//   let i
//   for (i = 0; i < length; ++i) {
//     if ((i + offset >= dst.length) || (i >= src.length)) break
//     dst[i + offset] = src[i]
//   }
//   return i
// }

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance(obj, type) {
  return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
}
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0) throw new RangeError('offset is not uint');
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length');
}
_Buffer.prototype.readUintBE = _Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }
  let val = this[offset + --byteLength];
  let mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }
  return val;
};
_Buffer.prototype.readUint8 = _Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset];
};
_Buffer.prototype.readUint16BE = _Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] << 8 | this[offset + 1];
};
_Buffer.prototype.readUint32BE = _Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return this[offset] * 0x1000000 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
};
_Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);
  let i = byteLength;
  let mul = 1;
  let val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;
  if (val >= mul) val -= Math.pow(2, 8 * byteLength);
  return val;
};
_Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return this[offset];
  return (0xff - this[offset] + 1) * -1;
};
_Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  const val = this[offset + 1] | this[offset] << 8;
  return val & 0x8000 ? val | 0xFFFF0000 : val;
};
_Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
};
_Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, true, 23, 4);
};
_Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, false, 23, 4);
};
_Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, true, 52, 8);
};
_Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, false, 52, 8);
};

// export default Buffer;
// export let Buffer = exports.Buffer;
// export default module.exports;

// export _Buffer;

export const Buffer = _Buffer;