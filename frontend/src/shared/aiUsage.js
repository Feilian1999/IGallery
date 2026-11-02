// How an artwork used AI, as shown to visitors and offered to uploaders.
export const AI_USAGE = {
  none: {name: "未使用 AI", short: null, hint: "完全由創作者自己完成"},
  assisted: {name: "AI 輔助", short: "AI 輔助", hint: "部分過程使用 AI，例如構圖、上色或修圖"},
  generated: {name: "AI 生成", short: "AI 生成", hint: "主要由 AI 生成"},
  unspecified: {name: "未標註", short: null, hint: ""},
};

export const AI_CHOICES = ["none", "assisted", "generated"];
