

async function setupWebcam(video) {
    return new Promise( ( resolve, reject ) => {
        const navigatorAny = navigator;
        navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
        if( navigator.getUserMedia ) {
            navigator.getUserMedia( { video: true },
                stream => {
                    video.srcObject = stream;
                    video.addEventListener( "loadeddata", resolve, false );
                },
            error => reject());
        }
        else {
            reject();
        }
    });
}

function drawIrises(face) {
  drawIris(face.annotations.rightEyeIris) 
  drawIris(face.annotations.leftEyeIris) 
}

function drawIris(iris) {
    // iris points are array of [center, left, top, right, bottom] each with [x,y,z] values
   const x = iris[0][0] 
   const y = iris[0][1] 
   const r = y - iris[2][1] 

   output.beginPath();
   //arc(x,y,r,start,end) 
   output.arc(x, y, r, 0, 2 * Math.PI);
   output.stroke();
}

function isMouthOpen(face) {
    const eyeDist = Math.sqrt(
        ( face.annotations.leftEyeUpper1[ 3 ][ 0 ] - face.annotations.rightEyeUpper1[ 3 ][ 0 ] ) ** 2 +
        ( face.annotations.leftEyeUpper1[ 3 ][ 1 ] - face.annotations.rightEyeUpper1[ 3 ][ 1 ] ) ** 2 +
        ( face.annotations.leftEyeUpper1[ 3 ][ 2 ] - face.annotations.rightEyeUpper1[ 3 ][ 2 ] ) ** 2
    );
    const faceScale = eyeDist / 80;
    
    // Check for mouth open
    const lipsDist = Math.sqrt(
        ( face.annotations.lipsLowerInner[ 5 ][ 0 ] - face.annotations.lipsUpperInner[ 5 ][ 0 ] ) ** 2 +
        ( face.annotations.lipsLowerInner[ 5 ][ 1 ] - face.annotations.lipsUpperInner[ 5 ][ 1 ] ) ** 2 +
        ( face.annotations.lipsLowerInner[ 5 ][ 2 ] - face.annotations.lipsUpperInner[ 5 ][ 2 ] ) ** 2
    );
    // Scale to the relative face size
    return (lipsDist / faceScale) > 20;
}

async function trackFace(video, statusElement) {
    const faces = await model.estimateFaces( {
        input: video,
        returnTensors: false,
        flipHorizontal: false,
    });
    output.drawImage(
        video,
        0, 0, video.width, video.height,
        0, 0, video.width, video.height
    );
    faces.forEach( (face) => {
        drawIrises(face)
    })

    const _isMouthOpen = faces.some((face) => isMouthOpen(face));
    if(_isMouthOpen) {
        didParty = true;
        party.screen();
    } else {
        didParty = false;
    }

    statusElement.innerText = `Mouth: ${_isMouthOpen}`;

    requestAnimationFrame( () => { trackFace(video, statusElement)  });
}

let output = null;
let model = null;
let didParty = false;

async function main() {
    const video = document.getElementById("webcam");
    const statusElement = document.getElementById("status");
    await setupWebcam(video);
    video.play();
    let videoWidth = video.videoWidth;
    let videoHeight = video.videoHeight;
    video.width = videoWidth;
    video.height = videoHeight;

    let canvas = document.getElementById( "output" );
    canvas.width = video.width;
    canvas.height = video.height;

    output = canvas.getContext( "2d" );
    output.translate( canvas.width, 0 );
    output.scale( -1, 1 ); // Mirror cam
    output.fillStyle = "#fdffb6";
    output.strokeStyle = "#fdffb6";
    output.lineWidth = 2;

    // Load Face Landmarks Detection
    model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );

    statusElement.innerText = "Loaded!";

    trackFace(video, statusElement);
}

window.addEventListener('load', main);
