/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { VectorStyleColorEditor } from './components/vector/color/vector_style_color_editor';
import { VectorStyleSizeEditor } from './components/vector/size/vector_style_size_editor';

import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { FillableCircle, FillableVector } from '../../icons/additional_layer_icons';
import { ColorGradient } from '../../icons/color_gradient';
import { getHexColorRangeStrings } from '../../utils/color_utils';
import _ from 'lodash';

const DEFAULT_COLOR = '#e6194b';

export class VectorStyle {

  static type = 'VECTOR';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  static getComputedFieldName(fieldName) {
    return `__kbn__scaled(${fieldName})`;
  }

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptor(properties) {
    return {
      type: VectorStyle.type,
      properties: properties
    };
  }

  static getDisplayName() {
    return 'Vector style';
  }

  static renderEditor({ handleStyleChange, style, layer }) {

    const properties = { ...style.getProperties() };
    const handlePropertyChange = (propertyName, settings) => {
      properties[propertyName] = settings;//override single property, but preserve the rest
      const vectorStyleDescriptor = VectorStyle.createDescriptor(properties);
      handleStyleChange(vectorStyleDescriptor);
    };

    return (
      <Fragment>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <VectorStyleColorEditor
              styleProperty={'fillColor'}
              stylePropertyName={"Fill color"}
              handlePropertyChange={handlePropertyChange}
              styleDescriptor={properties.fillColor}
              layer={layer}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <VectorStyleColorEditor
              styleProperty={'lineColor'}
              stylePropertyName={"Line color"}
              handlePropertyChange={handlePropertyChange}
              styleDescriptor={properties.lineColor}
              layer={layer}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <VectorStyleSizeEditor
              styleProperty={'lineWidth'}
              stylePropertyName={"Line width"}
              handlePropertyChange={handlePropertyChange}
              styleDescriptor={properties.lineWidth}
              layer={layer}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <VectorStyleSizeEditor
              styleProperty={'iconSize'}
              stylePropertyName={"Icon size"}
              handlePropertyChange={handlePropertyChange}
              styleDescriptor={properties.iconSize}
              layer={layer}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  // Return list of fields used by dynamic properties
  getDynamicFieldNames() {
    const properties = this.getProperties();
    const fieldNames = [];
    Object.keys(properties).forEach(propertyName => {
      if (!this._isPropertyDynamic(propertyName)) {
        return;
      }

      const fieldName = _.get(properties[propertyName], 'options.field.name');
      if (fieldName) {
        fieldNames.push(fieldName);
      }
    });

    return fieldNames;
  }

  getProperties() {
    return this._descriptor.properties || {};
  }

  getHexColor(colorProperty) {

    if (!this._descriptor.properties[colorProperty] || !this._descriptor.properties[colorProperty].options) {
      return null;
    }

    return this._descriptor.properties[colorProperty].options.color;
  }

  _isPropertyDynamic(property) {
    if (!this._descriptor.properties[property]) {
      return false;
    }
    return this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  getIcon= (() => {
    const defaultStroke = 'grey';
    const strokeWidth = '1px';
    return (isPointsOnly = false) => {
      let style = {
        stroke: defaultStroke,
        strokeWidth,
        fill: 'none'
      };
      const isDynamic = this._isPropertyDynamic('fillColor');
      if (!isDynamic) {
        const { fillColor, lineColor } = this._descriptor.properties;
        const stroke = _.get(lineColor, 'options.color');
        const fill = _.get(fillColor, 'options.color');

        style = {
          ...stroke && { stroke } || { stroke: defaultStroke },
          strokeWidth,
          ...fill && { fill },
        };
      }

      return (
        isPointsOnly
          ? <FillableCircle style={style}/>
          : <FillableVector style={style}/>
      );
    };
  })();

  getColorRamp() {
    const color = _.get(this._descriptor, 'properties.fillColor.options.color');
    return color && this._isPropertyDynamic('fillColor')
      ? <ColorGradient color={color}/>
      : null;
  }

  static computeScaledValues(featureCollection, fieldName) {
    const features = featureCollection.features;
    if (!features.length) {
      return false;
    }

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < features.length; i++) {
      const newValue = parseFloat(features[i].properties[fieldName]);
      if (!isNaN(newValue)) {
        min = Math.min(min, newValue);
        max = Math.max(max, newValue);
      }
    }

    //scale to [0,1]
    const propName = VectorStyle.getComputedFieldName(fieldName);
    for (let i = 0; i < features.length; i++) {
      features[i].properties[propName] = (features[i].properties[fieldName] - min) / (max - min);
    }
    featureCollection.computed.push(fieldName);
    return true;
  }

  addScaledPropertiesBasedOnStyle(featureCollection) {

    const dynamicFieldNames = this.getDynamicFieldNames();
    if (dynamicFieldNames.length === 0) {
      return false;
    }

    if (!featureCollection) {
      return false;
    }

    if (!featureCollection.computed) {
      featureCollection.computed = [];
    }

    const updateStatuses = dynamicFieldNames.map((fieldName) => {
      return VectorStyle.computeScaledValues(featureCollection, fieldName);
    });
    return updateStatuses.some(r => r === true);
  }

  _getMBDataDrivenColor(property) {

    if (!this._descriptor.properties[property] || !this._descriptor.properties[property].options) {
      return null;
    }
    const { field, color } = this._descriptor.properties[property].options;
    if (field && color) {
      const colorRange = getHexColorRangeStrings(color, 8)
        .reduce((accu, curColor, idx, srcArr) => {
          accu = [ ...accu, idx / srcArr.length, curColor ];
          return accu;
        }, []);
      const originalFieldName = this._descriptor.properties[property].options.field.name;
      const targetName = VectorStyle.getComputedFieldName(originalFieldName);
      return [
        'interpolate',
        ['linear'],
        ['get', targetName],
        ...colorRange
      ];
    } else {
      return null;
    }
  }


  _getMbDataDrivenSize(property) {

    if (!this._descriptor.properties[property] || !this._descriptor.properties[property].options) {
      return null;
    }

    const { minSize, maxSize } = this._descriptor.properties[property].options;
    if (typeof minSize === 'number' && typeof maxSize === 'number') {
      const originalFieldName = this._descriptor.properties[property].options.field.name;
      const targetName = VectorStyle.getComputedFieldName(originalFieldName);
      return   ['interpolate',
        ['linear'],
        ['get', targetName],
        0, minSize,
        1, maxSize
      ];
    } else {
      return null;
    }
  }



  _getMBColor(property) {
    let color;
    if (
      this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.STATIC
    ) {
      color = this.getHexColor(property) || DEFAULT_COLOR;
    } else if (this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.DYNAMIC) {
      color = this._getMBDataDrivenColor(property);
    } else {
      throw new Error(`Style type not recognized: ${this._descriptor.properties[property].type}`);
    }
    return color;
  }

  _getMBOpacity(isTemp) {
    const DEFAULT_OPACITY = 0.5;
    const opacity = this._descriptor.properties.alphaValue || DEFAULT_OPACITY;
    return isTemp ? opacity * .8 : opacity; // TODO: Need better indicator of temp status
  }

  _getMbSize(property) {
    if (this._descriptor.properties[property].type === VectorStyle.STYLE_TYPE.STATIC) {
      return this._descriptor.properties[property].options.size;
    } else {
      return this._getMbDataDrivenSize(property);
    }
  }

  setMBPaintProperties(mbMap, sourceId, fillLayerId, lineLayerId, isTemp) {
    const opacity = this._getMBOpacity(isTemp);
    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor('fillColor');
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', opacity);
    } else {
      mbMap.setPaintProperty(fillLayerId, 'fill-color', null);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', 0);
    }

    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor('lineColor');
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', opacity);

    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-color', null);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', 0);
    }

    if (this._descriptor.properties.lineWidth && this._descriptor.properties.lineWidth.options) {
      const lineWidth = this._getMbSize('lineWidth');
      mbMap.setPaintProperty(lineLayerId, 'line-width', lineWidth);
    } else {
      mbMap.setPaintProperty(lineLayerId, 'line-width', 0);
    }
  }

  setMBPaintPropertiesForPoints(mbMap, sourceId, pointLayerId, isTemp) {
    const opacity = this._getMBOpacity(isTemp);
    if (this._descriptor.properties.fillColor) {
      const color = this._getMBColor('fillColor');
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', opacity);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', 0);
    }
    if (this._descriptor.properties.lineColor) {
      const color = this._getMBColor('lineColor');
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', opacity);

    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-color', null);
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-opacity', 0);
    }
    if (this._descriptor.properties.lineWidth && this._descriptor.properties.lineWidth.options) {
      const lineWidth = this._getMbSize('lineWidth');
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', lineWidth);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-stroke-width', 0);
    }
    if (this._descriptor.properties.iconSize && this._descriptor.properties.iconSize.options) {
      const iconSize = this._getMbSize('iconSize');
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', iconSize);
    } else {
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 0);
    }
  }
}
