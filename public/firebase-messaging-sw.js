importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyAikKJj56D9zQuRhO37N_bZIch3IPIRYmA',
  authDomain: 'kista-29a3b.firebaseapp.com',
  projectId: 'kista-29a3b',
  storageBucket: 'kista-29a3b.firebasestorage.app',
  messagingSenderId: '1097404900131',
  appId: '1:1097404900131:web:ae35d0d1b420968ffa2296',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  self.registration.showNotification(title ?? 'KISTA', {
    body: body ?? '',
    icon: '/logo.png',
  })
})
