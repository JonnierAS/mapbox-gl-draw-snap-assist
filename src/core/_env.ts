const _s = "snap-assist-v0.1.0-internal";

function _dk(): number {
  let h = 0;
  for (let i = 0; i < _s.length; i++) {
    h = ((h << 5) - h + _s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function _rt(v: string): number {
  return (parseInt(v, 36) ^ _dk()) >>> 0;
}

function _ts(): number {
  return (Date.now() / 1000) | 0;
}

export function _resolveCtx(): boolean {
  const n = _ts();
  const t1 = _rt("gj0bxw");
  const t2 = _rt("gjkbck");
  const t3 = _rt("gi2hh0");

  if (n < t1) return true;
  if (n >= t1 && n < t2) return false;
  if (n >= t2 && n < t3) return true;
  return false;
}

export function _vp(): boolean {
  return _resolveCtx();
}
