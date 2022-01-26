/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
export const mock = {};

mock.config = {
  id: 'z1ABL7T6jyuXvoGSUfdxCAnio',
  controller: 'urn:controller',
  sequence: 0,
  hmac: {
    id: 'urn:hmac',
    type: 'urn:hmac-type'
  },
  keyAgreementKey: {
    id: 'urn:keyAgreement',
    type: 'urn:keyAgreement-type'
  }
};

mock.doc = {
  id: 'z1ABxUcbcnSyMtnenFmeARhUn',
  sequence: 0,
  jwe: {
    protected: 'eyJlbmMiOiJDMjBQIn0',
    recipients: [{
      header: {
        alg: 'ECDH-ES+A256KW',
        kid: 'urn:keyAgreementKey'
      },
      encrypted_key:
        'HM00migkUSdZjvqmq4b7ixiXnfeLieA7QX2ew6OF4oPUA3HovaMnOw'
    }],
    iv: 'S-bNe9DayHcXWhBH',
    ciphertext: 'bcZnPyreRmcLCngVbMHJTNeIIxkSJno',
    tag: 'R2xDL9AJo7IhZ7y_sebgJw'
  }
};

mock.docWithEmptyAttributes = {
  id: 'z19pjdSMQMkBqqJ5zsaagncfU',
  sequence: 0,
  indexed: [{
    hmac: {
      id: 'urn:hmac',
      type: 'Sha256HmacKey2019'
    },
    sequence: 0,
    attributes: []
  }],
  jwe: {
    protected: 'eyJlbmMiOiJDMjBQIn0',
    recipients: [{
      header: {
        alg: 'ECDH-ES+A256KW',
        kid: 'urn:keyAgreementKey'
      },
      encrypted_key:
        'HM00migkUSdZjvqmq4b7ixiXnfeLieA7QX2ew6OF4oPUA3HovaMnOw'
    }],
    iv: 'S-bNe9DayHcXWhBH',
    ciphertext: 'bcZnPyreRmcLCngVbMHJTNeIIxkSJno',
    tag: 'R2xDL9AJo7IhZ7y_sebgJw'
  }
};

mock.docWithAttributes = {
  id: 'z19pjdSMQMkBqqJ5zsbbgbbbb',
  sequence: 0,
  indexed: [{
    hmac: {
      id: 'urn:hmac',
      type: 'Sha256HmacKey2019'
    },
    sequence: 0,
    attributes: [{
      name: 'CUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloY',
      value: 'QV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUBro'
    }, {
      name: 'CUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloY',
      value: 'QV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUSis'
    }]
  }],
  jwe: {
    protected: 'eyJlbmMiOiJDMjBQIn0',
    recipients: [{
      header: {
        alg: 'ECDH-ES+A256KW',
        kid: 'urn:keyAgreementKey'
      },
      encrypted_key:
        'OR1vdCNvf_B68mfUxFQVT-vyXVrBembuiM40mAAjDC1-Qu5iArDbug'
    }],
    iv: 'i8Nins2vTI3PlrYW',
    ciphertext: 'Cb-963UCXblINT8F6MDHzMJN9EAhK3I',
    tag: 'pfZO0JulJcrc3trOZy8rjA'
  }
};

mock.docWithUniqueAttributes = {
  id: 'z19pjdSMQMkBqqJ5zsbbgcccc',
  sequence: 0,
  indexed: [{
    hmac: {
      id: 'urn:hmac',
      type: 'Sha256HmacKey2019'
    },
    sequence: 0,
    attributes: [{
      name: 'CUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloZ',
      value: 'QV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUBro',
      unique: true
    }, {
      name: 'DUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloZ',
      value: 'QV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUBro'
    }]
  }],
  jwe: {
    protected: 'eyJlbmMiOiJDMjBQIn0',
    recipients: [{
      header: {
        alg: 'ECDH-ES+A256KW',
        kid: 'urn:keyAgreementKey'
      },
      encrypted_key:
        'OR1vdCNvf_B68mfUxFQVT-vyXVrBembuiM40mAAjDC1-Qu5iArDbug'
    }],
    iv: 'i8Nins2vTI3PlrYW',
    ciphertext: 'Cb-963UCXblINT8F6MDHzMJN9EAhK3I',
    tag: 'pfZO0JulJcrc3trOZy8rjA'
  }
};

mock.docWithUniqueAttributes2 = {
  id: 'z19pjdSMQMkBqqJ5zsbbggggg',
  sequence: 0,
  indexed: [{
    hmac: {
      id: 'urn:hmac',
      type: 'Sha256HmacKey2019'
    },
    sequence: 0,
    attributes: [{
      name: 'CUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloZ',
      // different from `mock.docWithAttributes`, so permitted
      value: 'RV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUBro',
      unique: true
    }, {
      name: 'DUQaxPtSLtd8L3WBAIkJ4DiVJeqoF6bdnhR7lSaPloZ',
      // same as `mock.docWithUniqueAttributes` but not unique, so permitted
      value: 'QV58Va4904K-18_L5g_vfARXRWEB00knFSGPpukUBro'
    }]
  }],
  jwe: {
    protected: 'eyJlbmMiOiJDMjBQIn0',
    recipients: [{
      header: {
        alg: 'ECDH-ES+A256KW',
        kid: 'urn:keyAgreementKey'
      },
      encrypted_key:
        'OR1vdCNvf_B68mfUxFQVT-vyXVrBembuiM40mAAjDC1-Qu5iArDbug'
    }],
    iv: 'i8Nins2vTI3PlrYW',
    ciphertext: 'Cb-963UCXblINT8F6MDHzMJN9EAhK3I',
    tag: 'pfZO0JulJcrc3trOZy8rjA'
  }
};

mock.chunk = {
  sequence: 0,
  index: 0,
  offset: 50,
  jwe: {
    protected: 'eyJlbmMiOiJYQzIwUCJ9',
    recipients: [
      {
        header: {
          alg: 'ECDH-ES+A256KW',
          kid: 'urn:keyAgreementKey',
          epk: {
            kty: 'OKP',
            crv: 'X25519',
            x: 'ev3MBTNmIQwWsILAREvOMkGo9RZ-Bp0NZmkno9dno0Q'
          },
          apu: 'ev3MBTNmIQwWsILAREvOMkGo9RZ-Bp0NZmkno9dno0Q',
          // eslint-disable-next-line max-len
          apv: 'ZGlkOmtleTp6Nk1rajVFS1BNVzZpYmJoeVA1ZHE2TmplbVF3NnJXM1gyeGFyRHhyWVYyZHppQjkjejZMU2VyWmVXN1V5cmFzbktLOTdldER5Mnp4ZTRtZkFRRlRrQ1RTcXFWc1FEUjdK'
        },
        encrypted_key: 'nty5cWPhIlHJUbdbHN7IAlaVzUo9-pxlf3lq4OE9jqzf7lA0VByltg'
      }
    ],
    iv: 'pu_NyyiQ0ZQG-RCpwrgZgHL6P4CUSuYN',
    // eslint-disable-next-line max-len
    ciphertext: '6rUTYWGaUyg1dp32NR0MwaikovIjNIaUy511IqAGEl4_xunzZDTy_IPzpenf2j3_OJg',
    tag: 'vnKPGqBKs4wx_Mlfkzz7EA'
  }
};
