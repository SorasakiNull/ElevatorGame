class ElevatorGame {
    constructor() {
        this.currentFloor = 1;
        this.score = 0;
        this.timeLeft = 60;
        this.gameRunning = false;
        this.passengers = [];
        this.elevatorPassengers = [];
        this.gameTimer = null;
        this.passengerSpawnTimer = null;
        this.passengerTimeoutTimer = null;
        this.timeoutIds = []; // タイムアウトIDを管理する配列
        this.gameId = 0; // ゲームIDでタイマーの有効性を管理
        
        this.initializeElements();
        this.bindEvents();
        // ゲームは自動開始しない
    }

    initializeElements() {
        this.elevatorElement = document.getElementById('elevator');
        this.elevatorPassengersElement = document.getElementById('elevator-passengers');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.gameOverElement = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.upBtn = document.getElementById('up-btn');
        this.downBtn = document.getElementById('down-btn');
        
        this.updateElevatorPosition();
        this.updateScore();
        // タイマーはゲーム開始時に更新
    }

    bindEvents() {
        // キーボードイベント
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            switch(e.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    e.preventDefault();
                    this.moveUp();
                    break;
                case 's':
                case 'arrowdown':
                    e.preventDefault();
                    this.moveDown();
                    break;
            }
        });

        // ボタンイベント
        this.upBtn.addEventListener('click', () => this.moveUp());
        this.downBtn.addEventListener('click', () => this.moveDown());
    }

    startGame() {
        this.gameId++; // ゲームIDをインクリメント
        this.gameRunning = true;
        this.score = 0;
        this.timeLeft = 60;
        this.passengers = [];
        this.elevatorPassengers = [];
        this.currentFloor = 1;
        
        this.updateScore();
        this.updateTimer();
        this.updateElevatorPosition();
        this.clearAllPassengers();
        this.updateElevatorDisplay();
        
        // ゲームタイマー開始
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // 乗客生成タイマー開始
        this.spawnPassengers();
    }

    spawnPassengers() {
        const spawnPassenger = () => {
            if (!this.gameRunning) return;
            
            // 時間が経つにつれて乗客の生成頻度を上げる
            const timeProgress = (60 - this.timeLeft) / 60;
            const spawnChance = 0.7 + (timeProgress * 0.25); // 0.7から0.95まで増加
            
            if (Math.random() < spawnChance) {
                this.createPassenger();
            }
            
            // 次の生成までの間隔（時間が経つにつれて短くなる）
            const nextSpawnDelay = Math.max(700, 2000 - (timeProgress * 1300));
            this.passengerSpawnTimer = setTimeout(spawnPassenger, nextSpawnDelay);
        };
        
        spawnPassenger();
    }

    createPassenger() {
        // ランダムな階で乗客を生成（現在の階以外）
        let floor;
        do {
            floor = Math.floor(Math.random() * 5) + 1;
        } while (floor === this.currentFloor);

        // ランダムな目的地を設定（現在の階と生成階以外）
        let destination;
        do {
            destination = Math.floor(Math.random() * 5) + 1;
        } while (destination === floor || destination === this.currentFloor);

        // 左右どちらかのサイドをランダムに選択
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const elementId = `passenger-${floor}-${side}`;
        
        // そのサイドに既に乗客がいるかチェック
        const existingPassenger = this.passengers.find(p => p.elementId === elementId);
        if (existingPassenger) {
            // 既に乗客がいる場合は再帰的に新しい乗客を生成
            setTimeout(() => this.createPassenger(), 1000);
            return;
        }

        const passenger = {
            id: Date.now() + Math.random(),
            floor: floor,
            destination: destination,
            spawnTime: Date.now(),
            side: side,
            elementId: elementId,
            element: document.getElementById(elementId),
            gameId: this.gameId // ゲームIDを保存
        };

        this.passengers.push(passenger);
        passenger.element.style.display = 'flex';
        passenger.element.textContent = destination;

        // 15秒後に乗客を削除（タイムアウト）
        const timeoutId = setTimeout(() => {
            // 現在のゲームIDと一致する場合のみ処理
            if (passenger.gameId === this.gameId && this.gameRunning) {
                this.removePassenger(passenger, 'timeout');
            }
        }, 15000);
        
        // タイムアウトIDを保存
        passenger.timeoutId = timeoutId;
        this.timeoutIds.push(timeoutId);
    }

    moveUp() {
        if (this.currentFloor < 5) {
            this.currentFloor++;
            this.updateElevatorPosition();
            this.checkPassengerPickup();
        }
    }

    moveDown() {
        if (this.currentFloor > 1) {
            this.currentFloor--;
            this.updateElevatorPosition();
            this.checkPassengerPickup();
        }
    }

    updateElevatorPosition() {
        // 各階の.floor要素を取得
        const building = document.getElementById('building');
        const floors = building.getElementsByClassName('floor');
        // 現在の階の.floor（1階=最下段なので5-currentFloor）
        const floorIndex = 5 - this.currentFloor;
        const targetFloor = floors[floorIndex];
        if (targetFloor) {
            targetFloor.appendChild(this.elevatorElement);
        }
    }

    checkPassengerPickup() {
        // 現在の階にいる乗客をチェック
        const passengersOnFloor = this.passengers.filter(p => p.floor === this.currentFloor);
        
        passengersOnFloor.forEach(passenger => {
            // エレベーターに乗せる
            this.pickupPassenger(passenger);
        });

        // エレベーター内の乗客の目的地をチェック
        const passengersToDrop = this.elevatorPassengers.filter(p => p.destination === this.currentFloor);
        
        passengersToDrop.forEach(passenger => {
            this.dropPassenger(passenger);
        });
    }

    pickupPassenger(passenger) {
        // 乗客をエレベーターに移動
        this.elevatorPassengers.push(passenger);
        this.passengers = this.passengers.filter(p => p.id !== passenger.id);
        
        // 乗客の表示を非表示にする
        passenger.element.style.display = 'none';
        
        // エレベーター内の乗客表示を更新
        this.updateElevatorDisplay();
        
        console.log(`乗客をピックアップ: ${passenger.floor}階 → ${passenger.destination}階`);
    }

    dropPassenger(passenger) {
        // エレベーターから降ろす
        this.elevatorPassengers = this.elevatorPassengers.filter(p => p.id !== passenger.id);
        
        // スコア計算
        this.calculateScore(passenger);
        
        // エレベーター内の乗客表示を更新
        this.updateElevatorDisplay();
        
        console.log(`乗客を降ろしました: ${passenger.destination}階`);
    }

    calculateScore(passenger) {
        let baseScore = 5;
        let penalty = 0;
        
        // エレベーター内の他の乗客の目的地をチェック
        const otherPassengers = this.elevatorPassengers.filter(p => p.id !== passenger.id);
        
        // 他の乗客の目的地に止まった回数をカウント
        const stopsAtOtherDestinations = otherPassengers.filter(p => 
            p.destination === passenger.destination
        ).length;
        
        // 1回止まるごとに-1ポイント
        penalty = stopsAtOtherDestinations;
        
        const finalScore = Math.max(0, baseScore - penalty);
        this.score += finalScore;
        
        this.updateScore();
        
        console.log(`スコア: +${finalScore} (基本5点 - ペナルティ${penalty}点)`);
    }

    removePassenger(passenger, reason) {
        // タイムアウトIDをクリア
        if (passenger.timeoutId) {
            clearTimeout(passenger.timeoutId);
            this.timeoutIds = this.timeoutIds.filter(id => id !== passenger.timeoutId);
            passenger.timeoutId = null;
        }
        
        if (reason === 'timeout') {
            // タイムアウトで-5ポイント
            this.score -= 5;
            this.updateScore();
            console.log(`乗客がタイムアウト: -5ポイント`);
        }
        
        // 乗客リストから削除
        this.passengers = this.passengers.filter(p => p.id !== passenger.id);
        this.elevatorPassengers = this.elevatorPassengers.filter(p => p.id !== passenger.id);
        
        // 表示を非表示にする
        passenger.element.style.display = 'none';
        
        // エレベーター内の乗客表示を更新
        this.updateElevatorDisplay();
    }

    clearAllPassengers() {
        for (let i = 1; i <= 5; i++) {
            const left = document.getElementById(`passenger-${i}-left`);
            const right = document.getElementById(`passenger-${i}-right`);
            if (left) left.style.display = 'none';
            if (right) right.style.display = 'none';
        }
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    updateTimer() {
        this.timerElement.textContent = this.timeLeft;
    }

    endGame() {
        this.gameRunning = false;
        
        // タイマーを停止
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.passengerSpawnTimer) {
            clearTimeout(this.passengerSpawnTimer);
            this.passengerSpawnTimer = null;
        }
        
        // 全てのタイムアウトIDを一括クリア
        this.timeoutIds.forEach(id => {
            clearTimeout(id);
        });
        this.timeoutIds = [];
        
        // ゲームオーバー画面を表示
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'flex';
        
        console.log(`ゲーム終了！最終スコア: ${this.score}`);
    }

    restart() {
        // ゲームオーバー画面を非表示
        this.gameOverElement.style.display = 'none';
        
        // ゲーム状態を停止
        this.gameRunning = false;
        
        // 既存のタイマーをクリア
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.passengerSpawnTimer) {
            clearTimeout(this.passengerSpawnTimer);
            this.passengerSpawnTimer = null;
        }
        
        // 全てのタイムアウトIDを一括クリア
        this.timeoutIds.forEach(id => {
            clearTimeout(id);
        });
        this.timeoutIds = [];
        
        // 乗客リストをクリア
        this.passengers = [];
        this.elevatorPassengers = [];
        
        // スタート画面に戻る
        const startScreen = document.getElementById('start-screen');
        const gameContainer = document.getElementById('game-container');
        if (startScreen) startScreen.style.display = 'flex';
        if (gameContainer) gameContainer.classList.remove('active');
    }

    updateElevatorDisplay() {
        // エレベーター内の乗客表示をクリア
        this.elevatorPassengersElement.innerHTML = '';
        this.elevatorPassengers.forEach(passenger => {
            const div = document.createElement('div');
            div.className = 'elevator-passenger';
            div.title = `目的地: ${passenger.destination}階`;
            div.textContent = passenger.destination;
            this.elevatorPassengersElement.appendChild(div);
        });
    }
}

// グローバル関数として再開機能を提供
function restartGame() {
    if (window.elevatorGame) {
        window.elevatorGame.restart();
    }
}

// スタートボタンをクリックしてゲームを開始
function startGame() {
    console.log('startGame function called');
    
    // スタート画面を非表示
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'none';
        console.log('Start screen hidden');
    } else {
        console.error('Start screen not found');
    }
    
    // ゲーム画面を表示
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        gameContainer.classList.add('active');
        console.log('Game container activated');
    } else {
        console.error('Game container not found');
    }
    
    // ゲームを開始
    if (window.elevatorGame) {
        window.elevatorGame.startGame();
        console.log('Game started');
    } else {
        console.error('ElevatorGame instance not found');
    }
}

// X（Twitter）でスコアをシェアする機能
function shareScore() {
    const score = window.elevatorGame ? window.elevatorGame.score : 0;
    const text = `エレベーターゲームで${score}ポイント獲得しました！🚀 #エレベーターゲーム`;
    const url = window.location.href;
    
    // Twitter Web Intentを使用
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    // 新しいウィンドウでTwitter投稿画面を開く
    window.open(twitterUrl, '_blank', 'width=600,height=400');
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game');
    
    // 要素の存在確認
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    
    if (!startScreen) {
        console.error('Start screen not found in DOM');
    }
    if (!gameContainer) {
        console.error('Game container not found in DOM');
    }
    
    // ゲームインスタンスを作成
    window.elevatorGame = new ElevatorGame();
    console.log('ElevatorGame instance created');
    
    // スタート画面が表示されていることを確認
    if (startScreen) {
        startScreen.style.display = 'flex';
        console.log('Start screen displayed');
    }
}); 