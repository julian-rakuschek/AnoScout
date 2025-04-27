import { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { useBucket, useTimeSeries } from "lib/hooks";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

export default function NavbarBreadcrumbs({ url, darkMode }: { url: string; darkMode: boolean }): ReactElement {
  const { bucketId, tsId } = useParams<{ bucketId?: string; tsId?: string }>();
  const bucket = useBucket(bucketId);
  const timeSeries = useTimeSeries(tsId);

  const breadcrumb_chain: { label: string; link: string }[] = [];
  const split = url.split("/").slice(1);

  if(split[0] === "buckets") {
    breadcrumb_chain.push({ label: "Bucket List", link: "/buckets" });
    if(bucket) {
      breadcrumb_chain.push({ label: `Bucket ${bucket.name}`, link: `/buckets/${bucket._id.$oid}` });
      if(split.length > 2 && !timeSeries) {
        breadcrumb_chain.push({ label: split[2].replace(/\b\w/g, l => l.toUpperCase()), link: `/buckets/${bucket._id.$oid}/${split[2]}` });
      }
      if(timeSeries) {
        breadcrumb_chain.push({ label: `Time Series ${timeSeries.name}`, link: `/buckets/${bucket._id.$oid}/timeSeries/${timeSeries._id.$oid}` });
      }
    }
  }

  return <div className="flex flex-row gap-3 justify-center items-center">
    {breadcrumb_chain.map((item, idx) =>
      <>
        <Link className={`text-sm font-semibold leading-6 ${(darkMode) ? "text-white before:border-b-white" : "text-gray-900 before:border-b-indigo-700"} flex flex-row items-center border-animation`} to={item.link}>{item.label}</Link>
        {idx < breadcrumb_chain.length -1 && <ChevronRightIcon className="w-4 h-4"/>}
      </>,
    )}
  </div>;
}


