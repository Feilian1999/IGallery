// Draws a museum wall label onto a canvas: title on top, a thin rule, then the
// 作者 / 角色 / 描述 rows. Shared by the 3D wall label and the admin preview,
// so it has no three.js dependency.
export const LABEL_WIDTH = 1.3;
export const PIXELS_PER_METER = 800;
const CANVAS_WIDTH = Math.round(LABEL_WIDTH * PIXELS_PER_METER);
const PADDING = 54;
export const TITLE_SIZE = 68;
export const ROW_SIZE = 40;
const ROW_HEIGHT = 60;
const SERIF = "\"Noto Serif TC\", \"Songti TC\", \"PMingLiU\", serif";
const SANS = "\"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif";
const EMPTY = "--";

// Breaks text into lines that fit maxWidth. Splits per character so CJK text wraps too.
const wrapText = (context, text, maxWidth) => {
  const lines = [];
  let line = "";
  [...text].forEach((char) => {
    if (line && context.measureText(line + char).width > maxWidth) {
      lines.push(line);
      line = "";
    }
    line += char;
  });
  lines.push(line);
  return lines;
};

export const drawLabelCanvas = ({title, rows, colors}) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const innerWidth = CANVAS_WIDTH - PADDING * 2;

  context.font = `600 ${TITLE_SIZE}px ${SERIF}`;
  const titleLines = wrapText(context, title || EMPTY, innerWidth);
  context.font = `500 ${ROW_SIZE}px ${SANS}`;
  const keyWidth = context.measureText("描述　").width;
  const wrapped = rows.map(([key, value]) => [key, wrapText(context, value || EMPTY, innerWidth - keyWidth)]);
  const rowLines = wrapped.reduce((count, [, lines]) => count + lines.length, 0);

  const titleBlock = titleLines.length * TITLE_SIZE * 1.3;
  canvas.width = CANVAS_WIDTH;
  canvas.height = Math.round(PADDING * 2 + titleBlock + 34 + rowLines * ROW_HEIGHT);

  context.fillStyle = colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textBaseline = "top";
  context.fillStyle = colors.text;
  context.font = `600 ${TITLE_SIZE}px ${SERIF}`;
  titleLines.forEach((line, i) => context.fillText(line, PADDING, PADDING + i * TITLE_SIZE * 1.3));

  let y = PADDING + titleBlock + 10;
  context.fillStyle = colors.rule;
  context.fillRect(PADDING, y, 56, 3);
  y += 24;

  wrapped.forEach(([key, lines]) => {
    context.font = `500 ${ROW_SIZE}px ${SANS}`;
    context.fillStyle = colors.muted;
    context.fillText(key, PADDING, y);
    context.fillStyle = colors.text;
    lines.forEach((line) => {
      context.fillText(line, PADDING + keyWidth, y);
      y += ROW_HEIGHT;
    });
  });

  return canvas;
};

export const labelRows = (artwork) => [["作者", artwork.author], ["角色", artwork.character], ["描述", artwork.description]];

