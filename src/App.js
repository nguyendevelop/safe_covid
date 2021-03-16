import React, { useEffect, useRef, useState } from 'react';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import './App.css';
import soundURL from './assets/sound.wav';

var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log('init...');
    await setupCamera();
    console.log('success camera...');
   
    // Create the classifier.
    classifier.current = knnClassifier.create();
    
    // Load mobilenet.
    mobilenetModule.current = await mobilenet.load();

    console.log('setup done...');
    console.log('project ran... Train 1 touch');

    initNotifications({ cooldown: 3000});
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      //xin quyen truy cap camera va cases browser
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    console.log('[${label}] Dang train may mat cua ban...');
    for (let i=0; i < TRAINING_TIME; ++i){
      console.log('Progress ${parseInt((i+1) / TRAINING_TIME * 100)}%');
      
      await training(label);
    }
    // console.log(label);
    
  }

  //

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    
    console.log(result);
      
    if (result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE  
    ) {
      console.log('Touched');
      if (canPlaySound.current){
        canPlaySound.current = false;
        sound.play();
      }
      notify('Bo tay ra ban ui', { body: 'Bạn vừa chạm tay vào mặt đấy'});
      setTouched(true);
    } else {
      console.log('Not Touched');
      setTouched(false);
    }

    await sleep(200);

    run();
  }

  //mili giay = 0
  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true;
    });

    // cleanup
    return () => {

    }
  }, []);



  return (
    <div className={'main ${touched}'}>
      <video 
        ref={video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn" onClick={() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
