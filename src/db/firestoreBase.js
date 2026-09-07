import { collection, doc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

/**
 * Firestoreのデータは全て `users/{uid}/...` の下に置く(フェーズ13)。
 *
 * 画面側のコード(courseApi.listCourses() など)は、誰がサインインしているかを
 * 意識せずに書けるようにしたい。そこで「今サインインしている人のuid」を
 * このモジュールだけが覚えておき、他のdb/*.jsファイルはここ経由で
 * コレクション・ドキュメントの参照を取得する。
 *
 * uidは AuthProvider が sign-in/sign-out のたびに setCurrentUid() で更新する。
 */
let currentUid = null

export function setCurrentUid(uid) {
  currentUid = uid
}

export function getCurrentUid() {
  return currentUid
}

function requireUid() {
  if (!currentUid) {
    throw new Error('サインインしていません')
  }
  return currentUid
}

/** users/{uid}/{name} のコレクション参照 */
export function userCollection(name) {
  return collection(db, 'users', requireUid(), name)
}

/** users/{uid}/{name}/{id} のドキュメント参照 */
export function userDoc(name, id) {
  return doc(db, 'users', requireUid(), name, String(id))
}
