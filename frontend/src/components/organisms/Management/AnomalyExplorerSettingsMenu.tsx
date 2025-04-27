import { AnomalyExplorerSettings, Bucket, Heatmap, RecAlgo, ScatterArrangement, ScatterColorings, Tabs } from "../../../types";
import { Menu, Transition } from "@headlessui/react";
import { CogIcon } from "@heroicons/react/24/outline";
import React, { Fragment, useEffect } from "react";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useQueryClient } from "@tanstack/react-query";
import { useBucketChannels } from "lib/hooks";
import AnomalyScatterPlot from "components/molecules/Exploration/AnomalyScatterPlot";

const radioSelections = [
  {
    "key": "scatterColoring",
    "label": "Color points by",
    "tabs": [Tabs.ANOMALY_LIST],
    "options": [
      { "label": "Severity", "value": ScatterColorings.SEVERITY },
      { "label": "User Ratings", "value": ScatterColorings.RATINGS },
      { "label": "Views", "value": ScatterColorings.VIEWS },
      { "label": "Recommender Ordering", "value": ScatterColorings.RECOMMENDER },
      { "label": "Clusters", "value": ScatterColorings.CLUSTERING },
    ],
  },
  {
    "key": "scatterPointArrangement",
    "label": "Arrange points by",
    "tabs": [Tabs.ANOMALY_LIST],
    "options": [
      { "label": "Score and length", "value": ScatterArrangement.SEVERITY },
      { "label": "Dimensionality Reduction", "value": ScatterArrangement.PROJECTION },
    ],
  },
  {
    "key": "recommenderAlgorithm",
    "label": "Recommender Algorithm",
    "tabs": [Tabs.ANOMALY_LIST, Tabs.ANOMALY_CLUSTER],
    "options": [
      { "label": "Severity Sort", "value": RecAlgo.SEVERITY },
      { "label": "Item-Based Collaborative Filtering", "value": RecAlgo.ICBF },
    ],
  },
];

export function AnomalyExplorerSettingsMenu({ bucket, settings, setSettings, maxClusters, tab }: {
  bucket: Bucket;
  settings: AnomalyExplorerSettings;
  setSettings: (settings: AnomalyExplorerSettings) => void;
  maxClusters: number;
  tab: Tabs;
}): JSX.Element {
  const queryClient = useQueryClient();
  const channels = useBucketChannels(bucket._id.$oid);

  useEffect(() => {
    updateSettingsProperty("channel", channels[0]);
  }, [channels.length]);

  const updateSettingsProperty = (option: string, new_value: ScatterColorings | ScatterArrangement | Heatmap | RecAlgo | boolean | string): void => {
    const old_settings: AnomalyExplorerSettings = { ...settings };
    // @ts-expect-error Dynamic write, I know for sure that option exists, so OK
    old_settings[option] = new_value;
    setSettings(old_settings);
  };

  const resetRatings = async (): Promise<void> => {
    await ApiRoutes.resetRatings.fetch({ params: { BID: bucket._id.$oid } });
    await queryClient.invalidateQueries();
  };

  const getSettingsForClusterScatterPlot = (): AnomalyExplorerSettings => {
    const settings_copy = { ...settings };
    settings_copy.scatterPointArrangement = ScatterArrangement.PROJECTION;
    settings_copy.scatterColoring = ScatterColorings.CLUSTER_RECOMMENDATIONS;
    settings_copy.scatterConvexHull = true;
    settings_copy.scatterDisableZoom = true;
    return settings_copy;
  };

  return <Menu as="div" className="flex flex-col justify-end items-end">
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform scale-50"
      enterTo="transform scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform scale-100"
      leaveTo="transform scale-50"
    >
      <Menu.Items className="bg-white rounded-xl p-3 mt-2 flex flex-row flex-nowrap gap-x-3 shadow-lg">
        {tab === Tabs.ANOMALY_CLUSTER && <div className="flex flex-col gap-y-3">
          <div className="grid grid-cols-5 gap-x-3">
            <div className="w-full text-center text-sm col-span-full">Number of Clusters</div>
            <div className="col-span-4 flex justify-center items-center w-full indigo-slider">
              <input
                type="range" min={1} max={maxClusters} step={1}
                value={settings.nClusters}
                onChange={e => updateSettingsProperty("nClusters", parseInt(e.target.value))}>
              </input>
            </div>
            <div className="col-span-1 text-sm text-center w-full">{settings.nClusters}</div>
          </div>

          <div className="w-[300px] h-[300px]">
            <AnomalyScatterPlot hideAxis={true} bucket={bucket} settings={getSettingsForClusterScatterPlot()}/>
          </div>
        </div>}
        <div className="flex flex-col gap-y-3">
          {radioSelections.filter(item => item.tabs.indexOf(tab) !== -1 && !(bucket.type === "classification" && item.key === "scatterPointArrangement")).map(category =>
            <div>
              <label className="text-base font-semibold text-gray-900">{category.label}</label>
              <fieldset>
                {category.options.map(option =>
                  <div className="flex items-center">
                    <input
                      id={`${category.key}_${option.value}`}
                      name={category.key}
                      checked={settings[category.key as keyof AnomalyExplorerSettings] === option.value}
                      type="radio" className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-offset-0 focus:ring-0"
                      onClick={() => updateSettingsProperty(category.key, option.value)}
                    />
                    <label htmlFor={`${category.key}_${option.value}`} className="ml-3 block text-sm font-medium leading-6 text-gray-900">{option.label}</label>
                  </div>,
                )}
                {((category.key === "scatterColoring" && settings.scatterColoring === ScatterColorings.CLUSTERING) || (category.key === "heatmap" && settings.heatmap === Heatmap.CLUSTER)) &&
                  <div className="w-[300px] bg-indigo-400/25 border-2 border-indigo-500 rounded-md p-2 mt-2">
                    <div className="grid grid-cols-6 items-center place-items-start">
                      <div className="w-full text-center text-sm col-span-full">Number of Clusters</div>
                      <div className="col-span-5 flex justify-center items-center w-full indigo-slider">
                        <input
                          type="range" min={1} max={maxClusters} step={1}
                          value={settings.nClusters}
                          onChange={e => updateSettingsProperty("nClusters", parseInt(e.target.value))}>
                        </input>
                      </div>
                      <div className="text-sm text-center w-full">{settings.nClusters}</div>
                      {category.key === "scatterColoring" && <div className="flex items-center col-span-full mt-3">
                        <input
                          id="convex_hull"
                          type="checkbox"
                          checked={settings.scatterConvexHull}
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-offset-0 focus:ring-0"
                          onClick={() => updateSettingsProperty("scatterConvexHull", !settings.scatterConvexHull)}
                        />
                        <label htmlFor="convex_hull" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Draw convex hull</label>
                      </div>}
                    </div>
                  </div>}
              </fieldset>
            </div>)}
          <div>
            <label className="text-base font-semibold text-gray-900">List Filter</label>
            <fieldset>
              <div className="flex items-center">
                <input
                  id="filter_unrated"
                  type="checkbox"
                  checked={settings.showOnlyUnrated}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-offset-0 focus:ring-0"
                  onClick={() => updateSettingsProperty("showOnlyUnrated", !settings.showOnlyUnrated)}
                />
                <label htmlFor="filter_unrated" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Show only unrated anomalies</label>
              </div>
              <div className="flex items-center">
                <input
                  id="filter_negative"
                  type="checkbox"
                  checked={settings.hideNegative}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-offset-0 focus:ring-0"
                  onClick={() => updateSettingsProperty("hideNegative", !settings.hideNegative)}
                />
                <label htmlFor="filter_negative" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Hide negative rated anomalies</label>
              </div>
            </fieldset>
          </div>
          <button className="text-sm text-red-500 bg-red-300/50 rounded-lg transition hover:bg-red-500 hover:text-white" onClick={() => resetRatings()}>Reset Ratings</button>
        </div>
      </Menu.Items>
    </Transition>
    <Menu.Button
      className="shadow-lg rounded-full bg-white px-2 py-2 w-10 h-10 flex justify-center items-center">
      <CogIcon className="w-7 h-7 text-gray-700"/>
    </Menu.Button>
  </Menu>;
}