'use client';

import { useMemo, useState } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { Layer, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export type AngleType = 'mc' | 'ic' | 'asc' | 'desc';

export type AstroLineFeatureProperties = {
  planet: string;
  symbol: string;
  color: string;
  angleType: AngleType;
  label: string;
};

type LineFeature = {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: AstroLineFeatureProperties;
};

export type AstroFeatureCollection = {
  type: 'FeatureCollection';
  features: LineFeature[];
};

type PopupState = {
  longitude: number;
  latitude: number;
  properties: AstroLineFeatureProperties;
};

type AstroMapGLProps = {
  data: AstroFeatureCollection;
  activePlanets: string[];
  activeAngles: AngleType[];
};

const SOURCE_ID = 'astro-lines-source';

export default function AstroMapGL({ data, activePlanets, activeAngles }: AstroMapGLProps) {
  const [popup, setPopup] = useState<PopupState | null>(null);

  const baseFilter = useMemo(() => {
    const planetFilter: unknown[] = activePlanets.length
      ? ['in', 'planet', ...activePlanets]
      : ['==', 'planet', '__none__'];
    const angleFilter: unknown[] = activeAngles.length
      ? ['in', 'angleType', ...activeAngles]
      : ['==', 'angleType', '__none__'];
    return ['all', planetFilter, angleFilter];
  }, [activeAngles, activePlanets]);

  const lineSolidFilter = useMemo(
    () => ['all', baseFilter, ['in', 'angleType', 'mc', 'asc']] as unknown[],
    [baseFilter],
  );

  const lineDashedFilter = useMemo(
    () => ['all', baseFilter, ['in', 'angleType', 'ic', 'desc']] as unknown[],
    [baseFilter],
  );

  const glowSolidLayer: LayerProps = {
    id: 'astro-lines-glow-solid',
    type: 'line',
    source: SOURCE_ID,
    filter: lineSolidFilter as never,
    paint: {
      'line-color': ['get', 'color'] as never,
      'line-width': 7,
      'line-opacity': 0.2,
      'line-blur': 1.5,
    },
  };

  const glowDashedLayer: LayerProps = {
    id: 'astro-lines-glow-dashed',
    type: 'line',
    source: SOURCE_ID,
    filter: lineDashedFilter as never,
    paint: {
      'line-color': ['get', 'color'] as never,
      'line-width': 7,
      'line-opacity': 0.18,
      'line-blur': 1.5,
      'line-dasharray': [1.2, 1.8],
    },
  };

  const linesSolidLayer: LayerProps = {
    id: 'astro-lines-solid',
    type: 'line',
    source: SOURCE_ID,
    filter: lineSolidFilter as never,
    paint: {
      'line-color': ['get', 'color'] as never,
      'line-width': 2.5,
      'line-opacity': 0.95,
    },
  };

  const linesDashedLayer: LayerProps = {
    id: 'astro-lines-dashed',
    type: 'line',
    source: SOURCE_ID,
    filter: lineDashedFilter as never,
    paint: {
      'line-color': ['get', 'color'] as never,
      'line-width': 2.5,
      'line-opacity': 0.95,
      'line-dasharray': [1.2, 1.8],
    },
  };

  return (
    <div className="h-[50vh] w-full overflow-hidden rounded-2xl border border-slate-700 md:h-[70vh]">
      <Map
        mapLib={maplibregl}
        initialViewState={{ latitude: 20, longitude: 0, zoom: 1.5 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['astro-lines-solid', 'astro-lines-dashed']}
        onMouseMove={(event) => {
          const feature = event.features?.[0] as LineFeature | undefined;
          if (!feature?.properties) {
            setPopup(null);
            return;
          }
          setPopup({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            properties: feature.properties,
          });
        }}
        onMouseLeave={() => setPopup(null)}
        onClick={(event) => {
          const feature = event.features?.[0] as LineFeature | undefined;
          if (!feature?.properties) {
            return;
          }
          setPopup({
            longitude: event.lngLat.lng,
            latitude: event.lngLat.lat,
            properties: feature.properties,
          });
        }}
        cursor={popup ? 'pointer' : 'grab'}
      >
        <NavigationControl position="top-right" />

        <Source id={SOURCE_ID} type="geojson" data={data as never}>
          <Layer {...glowSolidLayer} />
          <Layer {...glowDashedLayer} />
          <Layer {...linesSolidLayer} />
          <Layer {...linesDashedLayer} />
        </Source>

        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="top"
          >
            <p className="text-xs text-slate-200">{popup.properties.label}</p>
          </Popup>
        )}
      </Map>
    </div>
  );
}
