import { createContainer } from "@calcom/features/di/di";

import {
  type SmokeTestService,
  moduleLoader as smokeTestServiceModuleLoader,
} from "./SmokeTestService.module";

const smokeTestServiceContainer = createContainer();

export function getSmokeTestService(): SmokeTestService {
  smokeTestServiceModuleLoader.loadModule(smokeTestServiceContainer);
  return smokeTestServiceContainer.get<SmokeTestService>(smokeTestServiceModuleLoader.token);
}
