/** 表单字符串格式校验（仅语法，不含业务规则）。 */

/** 非空且为非负整数字符串。 */
export function isRequiredNonNegativeIntString(raw: string): boolean {
  return /^\d+$/.test(raw.trim());
}

/** 空串或合法非负整数字符串。 */
export function isOptionalNonNegativeIntString(raw: string): boolean {
  const t = raw.trim();
  return t === '' || /^\d+$/.test(t);
}

/** 空串或十进制字面量（无科学计数法），且可解析为有限数。 */
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
