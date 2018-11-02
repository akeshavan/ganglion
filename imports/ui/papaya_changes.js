import "./qc.js"

papaya.volume.Orientation.prototype.convertCoordinate = function (coord, coordConverted) {
    //console.log("in this convertCoordinate")
    /*coordConverted.x = papayaRoundFast((coord.x * this.orientMat[0][0]) + (coord.y * this.orientMat[0][1]) +
        (coord.z * this.orientMat[0][2]) + (this.orientMat[0][3]));
    coordConverted.y = papayaRoundFast((coord.x * this.orientMat[1][0]) + (coord.y * this.orientMat[1][1]) +
        (coord.z * this.orientMat[1][2]) + (this.orientMat[1][3]));
    coordConverted.z = papayaRoundFast((coord.x * this.orientMat[2][0]) + (coord.y * this.orientMat[2][1]) +
        (coord.z * this.orientMat[2][2]) + (this.orientMat[2][3]));*/
    coordConverted.x = (coord.x * this.orientMat[0][0]) + (coord.y * this.orientMat[0][1]) +
        (coord.z * this.orientMat[0][2]) + (this.orientMat[0][3]);
    coordConverted.y = (coord.x * this.orientMat[1][0]) + (coord.y * this.orientMat[1][1]) +
        (coord.z * this.orientMat[1][2]) + (this.orientMat[1][3]);
    coordConverted.z = (coord.x * this.orientMat[2][0]) + (coord.y * this.orientMat[2][1]) +
        (coord.z * this.orientMat[2][2]) + (this.orientMat[2][3]);
    return coordConverted;
};

papaya.volume.nifti.HeaderNIFTI.prototype.getOrigin = function (forceQ, forceS) {
    var origin = new papaya.core.Coordinate(0, 0, 0),
        qFormMatParams,
        affineQform,
        affineQformInverse,
        affineSformInverse,
        orientation,
        someOffsets,
        xyz, sense,
        xIndex, yIndex, zIndex,
        xFlip, yFlip, zFlip;

    if ((this.nifti.qform_code > 0) && !forceS) {
        if (this.qFormHasRotations()) {
            affineQform = this.nifti.getQformMat();
            affineQformInverse = numeric.inv(affineQform);
            origin.setCoordinate(affineQformInverse[0][3], affineQformInverse[1][3], affineQformInverse[2][3]);
        } else {
            qFormMatParams = this.nifti.convertNiftiQFormToNiftiSForm(this.nifti.quatern_b, this.nifti.quatern_c,
                this.nifti.quatern_d, this.nifti.qoffset_x, this.nifti.qoffset_y, this.nifti.qoffset_z,
                this.nifti.pixDims[1], this.nifti.pixDims[2], this.nifti.pixDims[3], this.nifti.pixDims[0]);

            orientation = this.nifti.convertNiftiSFormToNEMA(qFormMatParams);

            if (!papaya.volume.Orientation.isValidOrientationString(orientation)) {
                orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
            }

            xyz = orientation.substring(0, 3).toUpperCase();
            sense = orientation.substring(3);
            xIndex = xyz.indexOf('X');
            yIndex = xyz.indexOf('Y');
            zIndex = xyz.indexOf('Z');
            xFlip = (sense.charAt(xIndex) === '+');
            yFlip = (sense.charAt(yIndex) === '+');
            zFlip = (sense.charAt(zIndex) === '+');

            someOffsets = new Array(3);
            someOffsets[0] = ((this.nifti.qoffset_x / this.nifti.pixDims[xIndex + 1])) * (xFlip ? -1 : 1);
            someOffsets[1] = ((this.nifti.qoffset_y / this.nifti.pixDims[yIndex + 1])) * (yFlip ? -1 : 1);
            someOffsets[2] = ((this.nifti.qoffset_z / this.nifti.pixDims[zIndex + 1])) * (zFlip ? -1 : 1);
            //AK: last arg of this method used to be true (to round)
            origin.setCoordinate(someOffsets[0], someOffsets[1], someOffsets[2], false);
            //console.log("origin", origin)
        }
    } else if ((this.nifti.sform_code > 0) && !forceQ) {
        if (this.sFormHasRotations()) {
            affineSformInverse = numeric.inv(this.nifti.affine);
            origin.setCoordinate(affineSformInverse[0][3], affineSformInverse[1][3], affineSformInverse[2][3]);
        } else {
            orientation = this.nifti.convertNiftiSFormToNEMA(this.nifti.affine);

            if (!papaya.volume.Orientation.isValidOrientationString(orientation)) {
                orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
            }

            xyz = orientation.substring(0, 3).toUpperCase();
            sense = orientation.substring(3);
            xIndex = xyz.indexOf('X');
            yIndex = xyz.indexOf('Y');
            zIndex = xyz.indexOf('Z');
            xFlip = (sense.charAt(xIndex) === '+');
            yFlip = (sense.charAt(yIndex) === '+');
            zFlip = (sense.charAt(zIndex) === '+');

            someOffsets = new Array(3);
            someOffsets[0] = ((this.nifti.affine[0][3] / this.nifti.pixDims[xIndex + 1])) * (xFlip ? -1 : 1);
            someOffsets[1] = ((this.nifti.affine[1][3] / this.nifti.pixDims[yIndex + 1])) * (yFlip ? -1 : 1);
            someOffsets[2] = ((this.nifti.affine[2][3] / this.nifti.pixDims[zIndex + 1])) * (zFlip ? -1 : 1);
            //console.log("sform code", xIndex, yIndex, zIndex)
            origin.setCoordinate(someOffsets[0], someOffsets[1], someOffsets[2], true);
        }
    }

    if (origin.isAllZeros()) {
        origin.setCoordinate(this.nifti.dims[1] / 2.0, this.nifti.dims[2] / 2.0, this.nifti.dims[3] / 2.0);
        //console.log("isALlZeros")
    }
    //console.log("origin is", origin)
    return origin;
};

papaya.viewer.Viewer.prototype.drawViewer = function (force, skipUpdate) {
  var draw = Session.get("isDrawing")
  if (!draw){
    var radiological = (this.container.preferences.radiological === "Yes"),
        showOrientation = (this.container.preferences.showOrientation === "Yes");

    if (!this.initialized) {
        this.drawEmptyViewer();
        return;
    }

    this.context.save();


        //skipUpdate = true


    if (skipUpdate) {
        this.axialSlice.repaint(this.currentCoord.z, force, this.worldSpace);
        this.coronalSlice.repaint(this.currentCoord.y, force, this.worldSpace);
        this.sagittalSlice.repaint(this.currentCoord.x, force, this.worldSpace);
    } else {
        if (force || (this.draggingSliceDir !== papaya.viewer.ScreenSlice.DIRECTION_AXIAL)) {
            this.axialSlice.updateSlice(this.currentCoord.z, force, this.worldSpace);
        }

        if (force || (this.draggingSliceDir !== papaya.viewer.ScreenSlice.DIRECTION_CORONAL)) {
            this.coronalSlice.updateSlice(this.currentCoord.y, force, this.worldSpace);
        }

        if (force || (this.draggingSliceDir !== papaya.viewer.ScreenSlice.DIRECTION_SAGITTAL)) {
            this.sagittalSlice.updateSlice(this.currentCoord.x, force, this.worldSpace);
        }
    }

    if (this.hasSurface() && (!papaya.utilities.PlatformUtils.smallScreen || force || (this.selectedSlice === this.surfaceView))) {
        this.surfaceView.draw();
    }

    // intialize screen slices
    if (this.container.preferences.smoothDisplay === "No") {
        this.context.imageSmoothingEnabled = false;
        this.context.webkitImageSmoothingEnabled = false;
        this.context.mozImageSmoothingEnabled = false;
        this.context.msImageSmoothingEnabled = false;
    } else {
        this.context.imageSmoothingEnabled = true;
        this.context.webkitImageSmoothingEnabled = true;
        this.context.mozImageSmoothingEnabled = true;
        this.context.msImageSmoothingEnabled = true;
    }

    // draw screen slices
    this.drawScreenSlice(this.mainImage);

    if (this.container.orthogonal) {
        this.drawScreenSlice(this.lowerImageTop);
        this.drawScreenSlice(this.lowerImageBot);

        if (this.hasSurface()) {
            this.drawScreenSlice(this.lowerImageBot2);
        }
    }

    if (showOrientation || radiological) {
        this.drawOrientation();
    }

    if (this.container.preferences.showCrosshairs === "Yes" && !draw) {
        this.drawCrosshairs();
    }

    if (this.container.preferences.showRuler === "Yes") {
        this.drawRuler();
    }

    if (this.container.display) {
        this.container.display.drawDisplay(this.currentCoord.x, this.currentCoord.y, this.currentCoord.z,
            this.getCurrentValueAt(this.currentCoord.x, this.currentCoord.y, this.currentCoord.z));
    }

    if (this.container.contextManager && this.container.contextManager.drawToViewer) {
        this.container.contextManager.drawToViewer(this.context);
    }
    //console.log("mindcontrol template is", this.mindcontrol_template)
  }
    fill_all(this.mindcontrol_template)

};

papaya.viewer.Viewer.prototype.convertScreenToImageCoordinateX = function (xLoc, screenSlice) {
    return papaya.viewer.Viewer.validDimBounds((xLoc - screenSlice.finalTransform[0][2]) / screenSlice.finalTransform[0][0],
        screenSlice.xDim);
};

papaya.viewer.Viewer.prototype.convertScreenToImageCoordinateY = function (yLoc, screenSlice) {
    return papaya.viewer.Viewer.validDimBounds((yLoc - screenSlice.finalTransform[1][2]) / screenSlice.finalTransform[1][1],
        screenSlice.yDim);
};