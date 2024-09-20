import json
import argparse as ap
from pathlib import Path

from pycocotools.coco import COCO
from pycocotools import mask as mask_utils
import numpy as np
import cv2

parser = ap.ArgumentParser()
path_group = parser.add_mutually_exclusive_group()
path_group.add_argument("--path", type=str, action="store")
path_group.add_argument("--directory", type=str, action="store")

args = parser.parse_args()


# Function to convert RLE to polygon
def rle_to_polygon(rle):
    mask = mask_utils.decode(rle)
    contours, _ = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    polygons = []
    for contour in contours:
        polygon = contour.flatten().tolist()
        if len(polygon) > 4:  # Ignore small polygons
            polygons.append(polygon)
    return polygons


def run(cocoImgs):
    # Create a new dictionary for the updated annotations
    new_annotations = {
        "images": [],
        "categories": cocoImgs[0].dataset["categories"],
        "annotations": [],
    }
    image_id_offset = 0
    ann_id_offset = 0
    # Process each annotation
    for coco in cocoImgs:
        for img in coco.dataset["images"]:
            img["id"] += image_id_offset
            new_annotations["images"].append(img)

        for ann in coco.dataset["annotations"]:
            ann["image_id"] += image_id_offset
            ann["id"] += ann_id_offset
            if (
                "segmentation" in ann
                and isinstance(ann["segmentation"], dict)
                and isinstance(ann["segmentation"]["counts"], list)
            ):
                # Convert RLE to mask, then to polygon
                rle = mask_utils.frPyObjects(
                    ann["segmentation"],
                    ann["segmentation"]["size"][0],
                    ann["segmentation"]["size"][1],
                )
                polygons = rle_to_polygon(rle)

                # Update the annotation
                ann["segmentation"] = polygons

            new_annotations["annotations"].append(ann)

        ann_id_offset = len(new_annotations["annotations"])
        image_id_offset = len(new_annotations["images"])

    # Save the new annotations
    with open("new_annotations.json", "w") as f:
        json.dump(new_annotations, f)


def main():
    cocoImgs: list[COCO] = []

    if args.path:
        # Load the COCO annotation file
        cocoImgs = [COCO(args.path)]

    elif args.directory:
        json_paths = Path(args.directory).glob("*.json")
        cocoImgs = [COCO(path) for path in json_paths]
    # Load all the files from directory

    if cocoImgs == []:
        raise Exception("No json file found! ")

    else:
        run(cocoImgs)


if __name__ == "__main__":
    main()
