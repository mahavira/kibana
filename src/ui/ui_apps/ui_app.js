/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import path from 'path';
import { UiNavLink } from '../ui_nav_links';

export class UiApp {
  constructor(kbnServer, spec) {
    const {
      pluginId,
      id = pluginId,
      main,
      title,
      order = 0,
      description,
      icon,
      hidden,
      linkToLastSubUrl,
      listed,
      url = `/app/${id}`,
      styleSheetPath,
    } = spec;

    if (!id) {
      throw new Error('Every app must specify an id');
    }

    this._id = id;
    this._main = main;
    this._title = title;
    this._order = order;
    this._description = description;
    this._icon = icon;
    this._linkToLastSubUrl = linkToLastSubUrl;
    this._hidden = hidden;
    this._listed = listed;
    this._url = url;
    this._pluginId = pluginId;
    this._kbnServer = kbnServer;
    this._styleSheetPath = styleSheetPath;

    if (this._pluginId && !this._getPlugin()) {
      throw new Error(`Unknown plugin id "${this._pluginId}"`);
    }

    if (!this.isHidden()) {
      // unless an app is hidden it gets a navlink, but we only respond to `getNavLink()`
      // if the app is also listed. This means that all apps in the kibanaPayload will
      // have a navLink property since that list includes all normally accessible apps
      this._navLink = new UiNavLink(kbnServer.config.get('server.basePath'), {
        id: this._id,
        title: this._title,
        order: this._order,
        description: this._description,
        icon: this._icon,
        url: this._url,
        linkToLastSubUrl: this._linkToLastSubUrl
      });
    }
  }

  getId() {
    return this._id;
  }

  getPluginId() {
    const plugin = this._getPlugin();
    return plugin ? plugin.id : undefined;
  }

  isHidden() {
    return !!this._hidden;
  }

  isListed() {
    return (
      !this.isHidden() &&
      (this._listed == null || !!this._listed)
    );
  }

  getNavLink() {
    if (this.isListed()) {
      return this._navLink;
    }
  }

  getMainModuleId() {
    return this._main;
  }

  getStyleSheetUrlPath() {
    if (!this._styleSheetPath) {
      return;
    }

    const plugin = this._getPlugin();

    // get the path of the stylesheet relative to the public dir for the plugin
    let relativePath = path.relative(plugin.publicDir, this._styleSheetPath);

    // replace back slashes on windows
    relativePath = relativePath.split('\\').join('/');

    // replace the extension of relativePath to be .css
    relativePath = relativePath.slice(0, -path.extname(relativePath).length) + '.css';

    return `plugins/${plugin.id}/${relativePath}`;
  }

  _getPlugin() {
    const pluginId = this._pluginId;
    const { plugins } = this._kbnServer;

    return pluginId
      ? plugins.find(plugin => plugin.id === pluginId)
      : undefined;
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      icon: this._icon,
      main: this._main,
      navLink: this._navLink,
      linkToLastSubUrl: this._linkToLastSubUrl,
      styleSheetPath: this._styleSheetPath,
    };
  }
}