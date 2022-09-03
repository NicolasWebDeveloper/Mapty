'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = String(new Date().getMilliseconds() + Math.round(Math.random() * 99999));
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
  }
}

// const run1 = new Running([40, -20], 7.2, 8, 9);
// const cycling1 = new Cycling([40, -20], 7.2, 8, 9);
// console.log(run1);
// console.log(cycling1);
/////////////////////////////////////////
//Application Architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    this._getLocalStorage();
    this._getPosition();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
      console.log('Error while loading Position!');
    });
  }

  _loadMap(pos) {
    console.log(pos);
    const { latitude, longitude } = pos.coords;
    console.log(`https://www.google.at/maps/@${latitude},${longitude},15.75z`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 10);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(el => {
      this._renderWorkoutMarker(el);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const { lat, lng } = this.#mapEvent.latlng;
    const validInputs = (...inputs) => inputs.every(i => i > 0 && Number.isFinite(i));
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!validInputs(distance, duration, cadence)) {
        return alert('Numbers need to be set and positive');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInputs(distance, duration, elevation)) {
        return alert('Numbers need to be set and positive');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    console.log(workout);
    this.#workouts.push(workout);
    console.log(this.#workouts);

    document.querySelectorAll('input').forEach(el => {
      el.value = '';
    });

    console.log(lat, lng);
    this._renderWorkoutMarker(workout);

    this._renderWorkout(workout);

    form.style.hidden = 'none';
    form.classList.add('hidden');
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === 'running') {
      html += ` 
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(i => i.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, { animate: true, pan: { duration: 1 } });

    // workout.click();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 500,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: workout.type === 'cycling' ? 'cycling-popup' : 'running-popup',
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴‍♂️'} ${workout.description}`)
      .openPopup();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(el => {
      this._renderWorkout(el);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    window.location.reload();
  }
}

const app = new App();
