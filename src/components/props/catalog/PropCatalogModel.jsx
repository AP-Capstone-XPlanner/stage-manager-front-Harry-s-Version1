import { useStageStore } from '../../../store/stageStore.js';
import { STAGE_CURTAIN_HEIGHT_LIMITS } from '../../../constants/stage.js';

import Refrigerator from '../appliances/Refrigerator.jsx';
import Television from '../appliances/Television.jsx';
import KitchenCabinets from '../appliances/KitchenCabinets.jsx';
import InteractiveLamp from '../appliances/InteractiveLamp.jsx';
import StageCurtain from '../stage/StageCurtain.jsx';
import WindowCurtain from '../stage/WindowCurtain.jsx';
import AnimatedDoorFlat from '../stage/AnimatedDoorFlat.jsx';
import InteractivePropTable from '../stage/InteractivePropTable.jsx';
import StageCouches from '../stage/StageCouches.jsx';
import Sofa from '../furniture/Sofa.jsx';
import CoffeeTable from '../furniture/CoffeeTable.jsx';
import DiningTable from '../furniture/DiningTable.jsx';
import BedFrame from '../furniture/BedFrame.jsx';
import Wardrobe from '../furniture/Wardrobe.jsx';
import Bookshelf from '../furniture/Bookshelf.jsx';
import Nightstand from '../furniture/Nightstand.jsx';
import Cube from '../shapes/Cube.jsx';
import Cylinder from '../shapes/Cylinder.jsx';
import Dancer from '../shapes/Dancer.jsx';
import Sphere from '../shapes/Sphere.jsx';
import Cone from '../shapes/Cone.jsx';
import Pyramid from '../shapes/Pyramid.jsx';
import RectangularPrism from '../shapes/RectangularPrism.jsx';
import DramaChair1Red from '../drama/DramaChair1Red.jsx';
import DramaChair2Blue from '../drama/DramaChair2Blue.jsx';
import DramaChair3Green from '../drama/DramaChair3Green.jsx';
import Piano from '../orchestra/Piano.jsx';
import DrumSet from '../orchestra/DrumSet.jsx';
import Harp from '../orchestra/Harp.jsx';
import MusicStand from '../orchestra/MusicStand.jsx';
import ConductorsPodium from '../orchestra/ConductorsPodium.jsx';
import Microphones from '../orchestra/Microphones.jsx';
import MusicianChair from '../orchestra/MusicianChair.jsx';

export function PropCatalogModel({ type, interactionState, onToggleDiningChair, onTogglePropTableChair }) {
  const stage = useStageStore((s) => s.stage);
  const curtainDuration = useStageStore((s) => s.curtainDuration);
  const curtainHeight =
    interactionState?.curtainHeight ?? STAGE_CURTAIN_HEIGHT_LIMITS.default;
  const stageBounds = { width: stage.width, height: curtainHeight };
  switch (type) {
    case 'sofa':
      return <Sofa />;
    case 'coffee_table':
      return <CoffeeTable />;
    case 'dining_set':
      return (
        <DiningTable
          chairsPulled={interactionState?.chairsPulled}
          onToggleChair={onToggleDiningChair}
        />
      );
    case 'bed':
      return <BedFrame />;
    case 'wardrobe':
      return <Wardrobe isOpen={interactionState?.open ?? false} />;
    case 'bookshelf':
      return <Bookshelf />;
    case 'nightstand':
      return <Nightstand isDrawerOpen={interactionState?.open ?? false} />;
    case 'musician_chair':
      return <MusicianChair />;
    case 'conductor_podium':
      return <ConductorsPodium />;
    case 'music_stand':
      return <MusicStand />;

    case 'refrigerator':
      return <Refrigerator />;
    case 'television':
      return <Television />;
    case 'kitchen_cabinets':
      return <KitchenCabinets />;
    case 'floor_lamp_wood':
      return <InteractiveLamp type={1} isLampOn={interactionState?.lampOn ?? true} />;
    case 'floor_lamp_metal':
      return <InteractiveLamp type={2} isLampOn={interactionState?.lampOn ?? true} />;

    case 'stage_curtain':
      return <StageCurtain isOpen={interactionState?.open ?? false} bounds={stageBounds} duration={curtainDuration} />;
    case 'window_curtain':
      return <WindowCurtain isOpen={interactionState?.open ?? false} duration={curtainDuration} />;
    case 'door_flat':
      return <AnimatedDoorFlat isOpen={interactionState?.open ?? false} />;
    case 'prop_table':
      return <InteractivePropTable chairsSpawned={interactionState?.chairsSpawned} onToggleChair={onTogglePropTableChair} />;
    case 'stage_couches':
      return <StageCouches />;

    case 'cube':
      return <Cube />;
    case 'cylinder':
      return <Cylinder />;
    case 'sphere':
      return <Sphere />;
    case 'cone':
      return <Cone />;
    case 'pyramid':
      return <Pyramid />;
    case 'rect_prism':
      return <RectangularPrism />;

    case 'drama_chair_red':
      return <DramaChair1Red />;
    case 'drama_chair_blue':
      return <DramaChair2Blue />;
    case 'drama_chair_green':
      return <DramaChair3Green />;

    case 'drum_set':
      return <DrumSet />;
    case 'microphones':
      return <Microphones />;
    case 'harp':
      return <Harp />;
    case 'piano':
      return <Piano />;

    case 'dancer':
      return <Dancer />;

    default:
      return null;
  }
}
