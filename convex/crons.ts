import { anyApi, cronJobs } from "convex/server";

const crons = cronJobs();

crons.interval("monitors:tick", { minutes: 1 }, anyApi.monitors.tick);

export default crons;

