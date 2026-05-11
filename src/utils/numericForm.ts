/**
 * 表单数字格式校验（仅格式，不做业务规则）
 * 用于石油王等多字段表单，避免 parseInt 悄悄吞掉非法后缀。
 */

/** 非负整数，且不允许空 */
export function isRequiredNonNegativeIntString(raw: string): boolean {
  return /^\d+$/.test(raw.trim());
}

/** 可选：空 或 非负整数 */
export function isOptionalNonNegativeIntString(raw: string): boolean {
  const t = raw.trim();
  return t === '' || /^\d+$/.test(t);
}

/**
 * 可选十进制字符串：空合法；否则只允许数字与一个小数点，不允许科学计数法等。
 * 允许：0.45、2.、.5、12（整数）
 */
export function isOptionalDecimalString(raw: string): boolean {
  const t = raw.trim();
  if (t === '') {
    return true;
  }
  if (!/^-?(?:\d+\.\d+|\d+\.|\d+|\.\d+)$/.test(t)) {
    return false;
  }
  return Number.isFinite(Number.parseFloat(t));
}
