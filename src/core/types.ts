// データ（JSON）の型（設計書 4章）。中身の正しさは data.ts の validateData で確かめる

/** 言語ごとの文（{ ja: "1円玉" } のように） */
export type LocalizedText = Record<string, string>;

/** お金の1段（currencies/*.json の tiers） */
export type Tier = {
  id: string;
  value: number;
  radius: number;
  /** 見た目：coin（硬貨）・bill（お札）・bundle（束）・case（ケース） */
  look: string;
  /** 硬貨の真ん中に穴がある（5円玉・50円玉） */
  hole?: boolean;
  label: LocalizedText;
  color: string;
  line: LocalizedText;
};

export type StockColorStep = { fromRatio: number; color: string; name: string };

/** 通貨ごとのデータ（決定 #13）。通貨を足すときはこの形の JSON を足す */
export type Currency = {
  id: string;
  version: number;
  symbol: string;
  locale: string;
  tiers: Tier[];
  topTier: { id: string; additive: boolean; growPerUnit: number; maxRadius: number; unitValue: number };
  drops: Record<string, number>;
  goal: { value: number };
  titleAmounts: Record<string, number>;
  stock: { startPrice: number; minUnit: number; sigDigits: number; colorSteps: StockColorStep[] };
};

export type TitleRule = {
  id: string;
  /** totalAtLeast（合計が amount 以上）・noStock（株を買わなかった）・boughtBeforeCrash（暴落の直前に買った）・else */
  rule: string;
  amount?: string;
  withinDrops?: number;
};

/** 通貨によらない設定（config.json） */
export type Config = {
  version: number;
  currency: string;
  box: {
    width: number;
    height: number;
    dangerLineY: number;
    dropY: number;
    overGraceMs: number;
    overConfirmMs: number;
    dropCooldownMs: number;
  };
  physics: { gravity: number; restitution: number; friction: number; density: number; fps: number };
  stock: {
    radius: number;
    drift: number;
    vol: number;
    crashProb: number;
    crashSize: number;
    crashCooldownDrops: number;
    floorPrice: number;
    buy: {
      button: boolean;
      sharesPerPress: number;
      payFrom: string;
      ballsRemain: boolean;
      fallFrom: string;
      advancesTime: boolean;
    };
  };
  titles: TitleRule[];
  sounds: Record<string, string>;
  hashtag: string;
  storageKey: string;
  links: { portal: string; tameru: string; tva: string; follow: string };
};
