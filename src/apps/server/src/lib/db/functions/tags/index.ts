import {
  create_industries,
  delete_industries,
  get_industries,
  update_industries,
} from "./industries";
import {
  create_provinces,
  delete_provinces,
  get_provinces,
  update_provinces,
} from "./provinces";
import {
  create_raisingStage,
  delete_raisingStage,
  get_raisingStage,
  update_raisingStage,
} from "./raisingStage";
import {
  create_teamSize,
  delete_teamSize,
  get_teamSize,
  update_teamSize,
} from "./teamSize";
import {
  create_experienceLevels,
  update_experienceLevels,
  delete_experienceLevels,
  get_experienceLevels,
} from "./experienceLevels";
import {
  create_jobTypes,
  delete_jobTypes,
  get_jobTypes,
  update_jobTypes,
} from "./jobTypes";
import {
  create_roles,
  delete_roles,
  get_roles,
  update_roles,
} from "./roles";
import { db, isDatabase, type Database } from "@/lib/db/runtime";

const withDefaultDb = <TArgs extends unknown[], TResult>(
  handler: (database: Database, ...args: TArgs) => TResult,
) => {
  return (...args: [Database, ...TArgs] | TArgs): TResult => {
    if (isDatabase(args[0])) {
      const [database, ...rest] = args as [Database, ...TArgs];
      return handler(database, ...rest);
    }
    return handler(db, ...(args as TArgs));
  };
};

const industries = {
  create: withDefaultDb(create_industries),
  read: withDefaultDb(get_industries),
  update: withDefaultDb(update_industries),
  delete: withDefaultDb(delete_industries),
};

const provinces = {
  create: withDefaultDb(create_provinces),
  read: withDefaultDb(get_provinces),
  update: withDefaultDb(update_provinces),
  delete: withDefaultDb(delete_provinces),
};

const raisingStage = {
  create: withDefaultDb(create_raisingStage),
  read: withDefaultDb(get_raisingStage),
  update: withDefaultDb(update_raisingStage),
  delete: withDefaultDb(delete_raisingStage),
};

const teamSize = {
  create: withDefaultDb(create_teamSize),
  read: withDefaultDb(get_teamSize),
  update: withDefaultDb(update_teamSize),
  delete: withDefaultDb(delete_teamSize),
};

const experienceLevels = {
  create: withDefaultDb(create_experienceLevels),
  read: withDefaultDb(get_experienceLevels),
  update: withDefaultDb(update_experienceLevels),
  delete: withDefaultDb(delete_experienceLevels),
};

const jobTypes = {
  create: withDefaultDb(create_jobTypes),
  read: withDefaultDb(get_jobTypes),
  update: withDefaultDb(update_jobTypes),
  delete: withDefaultDb(delete_jobTypes),
};

const roles = {
  create: withDefaultDb(create_roles),
  read: withDefaultDb(get_roles),
  update: withDefaultDb(update_roles),
  delete: withDefaultDb(delete_roles),
};

export { industries, provinces, raisingStage, teamSize, experienceLevels, jobTypes, roles };
