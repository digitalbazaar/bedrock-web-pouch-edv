/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
import {EdvClientCore} from '@digitalbazaar/edv-client';

export class PouchEdvClient extends EdvClientCore {
  /**
   * Creates a new EDV client for connecting to an Encrypted Data Vault (EDV)
   * that is stored in PouchDB.
   *
   * @param {object} options - The options to use.
   * @param {object} [options.hmac] - A default HMAC API for blinding
   *   indexable attributes.
   * @param {string} [options.id] - The ID of the EDV.
   * @param {object} [options.keyAgreementKey] - A default KeyAgreementKey
   *   API for deriving shared KEKs for wrapping content encryption keys.
   * @param {Function} [options.keyResolver] - A default function that returns
   *   a Promise that resolves a key ID to a DH public key.
   *
   * @returns {PouchEdvClient}.
   */
  constructor({hmac, id, keyAgreementKey, keyResolver} = {}) {
    super({hmac, id, keyAgreementKey, keyResolver});
  }

  static async create({edvId, password} = {}) {
    // FIXME: use `secrets.js` to get secret config associated with `edvId`
    // FIXME: unlock its secret using `password`, throwing if it fails
    // FIXME: create PouchEdvClient instance using `keyResolver` that resolves
    // only using the generated keys
  }
}
