#!/usr/bin/env node

import { getGtmSnapshot } from "../lib/gtm-report.js";

console.log(JSON.stringify(await getGtmSnapshot(), null, 2));
