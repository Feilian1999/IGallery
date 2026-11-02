/* eslint-disable react/no-unknown-property */
import * as React from "react";
import * as THREE from "three";
import PropTypes from "prop-types";
import {useFrame} from "@react-three/fiber";
import {markActive} from "../runtime";
import {drawLabelCanvas, labelRows, LABEL_WIDTH, PIXELS_PER_METER, TITLE_SIZE, ROW_SIZE} from "../labelCanvas";

export {LABEL_WIDTH};

const drawLabel = (options) => {
  const canvas = drawLabelCanvas(options);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return {texture, height: canvas.height / PIXELS_PER_METER};
};

// Canvas text needs the web fonts loaded first, otherwise it falls back silently.
const useFontsReady = () => {
  const [ready, setReady] = React.useState(() => !document.fonts || document.fonts.status === "loaded");
  React.useEffect(() => {
    if (ready || !document.fonts) return undefined;
    let cancelled = false;
    Promise.all([
      document.fonts.load(`600 ${TITLE_SIZE}px "Noto Serif TC"`, "作品"),
      document.fonts.load(`500 ${ROW_SIZE}px "Noto Sans TC"`, "作者"),
    ]).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
};

/**
 * The bottom-left corner sits at `position`. Fades in while `visible` is true.
 * @return {WallLabel} wall label
 */
const WallLabel = ({artwork, colors, position, visible}) => {
  const mesh = React.useRef();
  const fontsReady = useFontsReady();
  // redrawn once the web fonts arrive, so the first frame may use a fallback font
  const {texture, height} = React.useMemo(
      () => drawLabel({
        title: artwork.title,
        rows: labelRows(artwork),
        colors,
        fontsReady,
      }),
      [artwork, colors, fontsReady],
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
