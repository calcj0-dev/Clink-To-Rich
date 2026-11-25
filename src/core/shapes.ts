// お金の形（2026-11-25 オーナー決定）：硬貨は丸、お札・束・ケースは角の丸い四角（見た目もぶつかり方も同じ）。
// 四角の面積は、同じ段の丸（半径 r）とほぼ同じにする（箱の詰まり方を大きく変えないため）

export type ShapeSpec = { aspect: number; corner: number };
export type ShapeTable = Record<string, ShapeSpec>;

export type Shape = { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number; corner: number };

/** 見た目 look・半径 r（丸のときの大きさ）から形を決める。shapes にない look は丸 */
export function moneyShape(look: string, r: number, shapes: ShapeTable): Shape {
  const s = shapes[look];
  if (!s) return { kind: 'circle', r };
  // w × h ＝ π r²、w ÷ h ＝ aspect
  const h = Math.sqrt((Math.PI * r * r) / s.aspect);
  const w = h * s.aspect;
  return { kind: 'rect', w, h, corner: Math.min(w, h) * s.corner };
}

/** 横の半分の幅（落とす位置を箱の中に収めるのに使う） */
export function halfWidth(shape: Shape): number {
  return shape.kind === 'circle' ? shape.r : shape.w / 2;
}
