import {AxisOriginAlignment, Fitting, PartialOriginAlignment, RequiredOriginAlignment, alignmentToNumber, requiredOriginAlignmentFromPartial} from './alignment.ts';
import {Axis} from './axis.ts';
import * as dataURIConv from './data_uri_conv.ts';
import {cloneElement, createElement, getElementsBoundingBox, setAttributes} from './elements.ts';
import {getGlobalOptions} from './global_options.ts';
import {assets} from './index.ts';
import {DefaultPiece} from './pieces.ts';
import {loadEvent} from './internal_util.ts';

export type ImageType = "png" | "jpeg" | "gif";

export const DEFAULT_IMAGE_TYPE: ImageType = "png";

interface PartialImageScalingInterface {
  width?: number;
  height?: number;
  align?: PartialOriginAlignment;
  fitting?: Fitting;
}
export type PartialImageScaling = PartialImageScalingInterface | "auto";

interface ImageScalingInterface {
  readonly width: number;
  readonly height: number;
  readonly align: RequiredOriginAlignment;
  readonly fitting: Fitting;
}
type ImageScaling = ImageScalingInterface | "auto";
function imageScalingFromPartial(partialScaling: PartialImageScaling = "auto"): ImageScaling {
  if (partialScaling === "auto")
    return "auto";
  const {
    width = 1,
    height = 1,
    align,
    fitting = "fit",
  } = partialScaling;
  return {width, height, align: requiredOriginAlignmentFromPartial(align), fitting};
}

function mimeType(type: ImageType) {
  return dataURIConv.mimeTypeFromExt(type);
}

/** A class representing an image, usually referenced by URL or data URI. */
export class Image extends DefaultPiece {

  protected constructor(
    private readonly image: SVGImageElement,
    readonly scaling: ImageScaling,
  ) {
    super(image);
  }

  /** @deprecated */
  static async fromBinary({type = DEFAULT_IMAGE_TYPE, binData, scaling}: {
    type?: ImageType,
    binData: string,
    scaling?: PartialImageScaling,
  }) {
    return await Image.fromURL({
      url: dataURIConv.fromBinary({mimeType: mimeType(type), binData}),
      scaling,
    });
  }

  /** @deprecated */
  static async fromBase64({type = DEFAULT_IMAGE_TYPE, base64Data, scaling}: {
    type?: ImageType,
    base64Data: string,
    scaling?: PartialImageScaling,
  }) {
    return await Image.fromURL({
      url: dataURIConv.fromBase64({mimeType: mimeType(type), base64Data}),
      scaling,
    });
  }

  static async fromBlob(blob: Blob) {
    return await Image.fromURL(await dataURIConv.fromBlob(blob));
  }

  /**
   * Loads an image from a URL.
   * If it's an external URL, the image is fetched and encoded as a data URI instead.
   */
  static async fromURL(url: string): Promise<Image>;
  /**
   * Loads an image from a URL, with the specified scaling.
   * If it's an external URL, the image is fetched and encoded as a data URI instead.
   */
  static async fromURL(args: {
    url: string,
    scaling?: PartialImageScaling,
  }): Promise<Image>;
  static async fromURL(arg: string | {
    url: string,
    scaling?: PartialImageScaling,
  }) {
    const {url, scaling = undefined} = typeof arg === "string" ? {url: arg} : arg;
    const image = createElement({tagName: "image"});
    const loaded = loadEvent(image);
    setAttributes(image, {href: await dataURIConv.urlToDataURI(url)});
    await loaded;
    return Image.fromImage({
      image,
      canModifyImage: true,
      scaling,
    });
  }

  static async fromAsset(urlAsset: assets.ModuleImport<string>): Promise<Image>;
  static async fromAsset(args: {
    urlAsset: assets.ModuleImport<string>,
    scaling?: PartialImageScaling,
  }): Promise<Image>;
  static async fromAsset(arg: assets.ModuleImport<string> | {
    urlAsset: assets.ModuleImport<string>,
    scaling?: PartialImageScaling,
  }) {
    const {urlAsset, scaling = undefined} = arg instanceof Promise ? {urlAsset: arg} : arg;
    return await Image.fromURL({
      url: await assets.url(urlAsset),
      scaling,
    });
  }

  static fromImage(image: SVGImageElement): Image;
  static fromImage(args: {
    image: SVGImageElement,
    canModifyImage?: boolean,
    scaling?: PartialImageScaling,
  }): Image;
  static fromImage(arg: SVGImageElement | {
    image: SVGImageElement,
    canModifyImage?: boolean,
    scaling?: PartialImageScaling,
  }) {
    const {image, canModifyImage = false, scaling = undefined} =
      arg instanceof SVGImageElement ? {image: arg} : arg;
    const imageClone = canModifyImage ? image : cloneElement(image);
    const fullScaling = imageScalingFromPartial(scaling);
    applyImageScalingAttributes(imageClone, fullScaling);
    return new Image(imageClone, fullScaling);
  }

  setScaling(scaling: PartialImageScaling) {
    return Image.fromImage({image: this.image, scaling});
  }

}

function applyImageScalingAttributes(image: SVGImageElement, scaling: ImageScaling) {
  if (scaling === "auto") {
    const {imageAutoSizeLogic} = getGlobalOptions();
    if (imageAutoSizeLogic.widthAndHeight === "auto")
      setAttributes(image, {width: "auto", height: "auto"});
    if (imageAutoSizeLogic.measure) {
      const box = getElementsBoundingBox([image]);
      setAttributes(image, {width: box.width, height: box.height});
    }
  } else {
    const {
      width,
      height,
      align: {x, y},
      fitting,
    } = scaling;
    setAttributes(image, {
      width,
      height,
      x: -width * alignmentToNumber(x),
      y: -height * alignmentToNumber(y),
      preserveAspectRatio: fitting === "stretch" ? "none" :
        `x${getMinMidMax(x)}Y${getMinMidMax(y)} ${fitting === "fit" ? "meet" : "slice"}`,
    });
  }
}

function getMinMidMax(alignment: AxisOriginAlignment<Axis>) {
  const num = alignmentToNumber(alignment);
  if (num === 0)
    return "Min";
  if (num === 0.5)
    return "Mid";
  if (num === 1)
    return "Max";
  return num satisfies never;
}
