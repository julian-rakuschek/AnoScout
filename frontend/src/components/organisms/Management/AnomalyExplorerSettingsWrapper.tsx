import { AnomalyExplorerSettings, Bucket, Tabs } from "../../../types";
import React, { ReactElement } from "react";
import { AnomalyExplorerSettingsMenu } from "components/organisms/Management/AnomalyExplorerSettingsMenu";
import { useParams } from "react-router-dom";
import { useAnomalyClustering, useRecommendations } from "lib/hooks";
import { CenteredLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { getDValues } from "lib/helper/dendrogram";

export function AnomalyExplorerSettingsMenuWrapper({ bucket, settings, setSettings, tab }: {
  bucket: Bucket;
  settings: AnomalyExplorerSettings;
  setSettings: (settings: AnomalyExplorerSettings) => void;
  tab: Tabs;
}): ReactElement {
  const { bucketId } = useParams();
  if(bucketId == null) return <></>;

  const dendrogram = useAnomalyClustering(bucketId);
  const recommendations = useRecommendations(bucketId, settings.recommenderAlgorithm);

  if(dendrogram === undefined || !recommendations) return <div className="shadow-lg rounded-full bg-white px-2 py-2 w-10 h-10 flex justify-center items-center">
    <CenteredLoadingSpinner/>
  </div>;

  const dVals = getDValues(dendrogram).sort((a: number, b: number) => a - b);

  return <AnomalyExplorerSettingsMenu setSettings={setSettings} settings={settings} tab={tab} bucket={bucket} maxClusters={dVals.length} />;
}