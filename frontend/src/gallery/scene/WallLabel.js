/* eslint-disable react/no-unknown-property */
import * as React from "react";
import * as THREE from "three";
import PropTypes from "prop-types";
import {useFrame} from "@react-three/fiber";
import {useTranslation} from "react-i18next";
import {markActive} from "../runtime";
import {drawLabelCanvas, labelRows, labelSample, LABEL_WIDTH, PIXELS_PER_METER, TITLE_SIZE, ROW_SIZE} from "../labelCanvas";

export {LABEL_WIDTH};

const drawLabel = (options) => {
  const canvas = drawLabelCanvas(options);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return {texture, height: canvas.height / PIXELS_PER_METER};
};

const LABEL_FONTS = [`600 ${TITLE_SIZE}px "Noto Serif TC"`, `500 ${ROW_SIZE}px "Noto Sans TC"`];
// True when the loaded fonts already have every glyph of `text`.
const fontsCover = (text) => !document.fonts || LABEL_FONTS.every((font) => document.fonts.check(font, text));

// Canvas text needs the web fonts loaded first, otherwise it falls back silently.
// `sample` is the text about to be drawn, so a language switch loads its glyphs too.
const useFontsReady = (sample) => {
  const [readyFor, setReadyFor] = React.useState(() => (!document.fonts || document.fonts.status === "loaded" ? sample : null));
  React.useEffect(() => {
    if (readyFor === sample || fontsCover(sample)) return undefined;
    let cancelled = false;
    Promise.all(LABEL_FONTS.map((font) => document.fonts.load(font, sample))).finally(() => {
      if (!cancelled) setReadyFor(sample);
    });
    return () => {
      cancelled = true;
    };
  }, [sample, readyFor]);
  return readyFor === sample || fontsCover(sample);
};

/**
 * The bottom-left corner sits at `position`. Fades in while `visible` is true.
 * @return {WallLabel} wall label
 */
const WallLabel = ({artwork, colors, position, visible}) => {
  const mesh = React.useRef();
  // re-render (and redraw the row headings) when the interface language changes
  const {i18n} = useTranslation("gallery");
  const language = i18n.resolvedLanguage;
  const fontsReady = useFontsReady(React.useMemo(() => labelSample(), [language]));
  // redrawn once the web fonts arrive, so the first frame may use a fallback font
  const {texture, height} = React.useMemo(
      () => drawLabel({
        title: artwork.title,
        rows: labelRows(artwork),
        colors,
        fontsReady,
      }),
      [artwork, colors, fontsReady, language],
  );
  React.useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    const material = mesh.current.material;
    const goal = visible ? 1 : 0;
    if (material.opacity === goal) return;
    material.opacity = THREE.MathUtils.lerp(material.opacity, goal, 1 - Math.exp(-Math.min(delta, 0.1) * 5));
    if (Math.abs(material.opacity - goal) < 0.01) material.opacity = goal;
    mesh.current.visible = material.opacity > 0.01;
    // slide up a touch as it appears
    mesh.current.position.y = position[1] + height / 2 - (1 - material.opacity) * 0.05;
    markActive(100);
  });

  return (
    <mesh ref={mesh} position={[position[0] + LABEL_WIDTH / 2, position[1] + height / 2, position[2]]} visible={false}>
      <planeGeometry args={[LABEL_WIDTH, height]} />
      <meshBasicMaterial map={texture} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
};

WallLabel.propTypes = {
  artwork: PropTypes.object.isRequired,
  colors: PropTypes.object.isRequired,
  position: PropTypes.arrayOf(PropTypes.number).isRequired,
  visible: PropTypes.bool,
};

export default WallLabel;
