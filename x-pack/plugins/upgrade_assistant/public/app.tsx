/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPage, EuiPageBody, EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { FormattedMessage, injectI18nProvider } from '@kbn/i18n/react';

import { NEXT_MAJOR_VERSION } from '../common/version';
import { UpgradeAssistantTabs } from './components/tabs';

export const RootComponentUI: React.StatelessComponent = () => (
  <EuiPage restrictWidth data-test-subj="upgradeAssistantRoot">
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.upgradeAssistant.appTitle"
                defaultMessage="{version} Upgrade Assistant"
                values={{ version: `${NEXT_MAJOR_VERSION}.0` }}
              />
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <UpgradeAssistantTabs />
    </EuiPageBody>
  </EuiPage>
);

export const RootComponent = injectI18nProvider(RootComponentUI);
