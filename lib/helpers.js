/*!
 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
 */
export async function parseLocalId({id} = {}) {
  /* Note: Current implementation just returns the `id` as it is not prefixed
  with a base URI. This may change in the future. */
  return {base: '', localId: id};
}
