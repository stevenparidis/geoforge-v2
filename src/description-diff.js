/**
 * GeoForge — sentence-level description differ
 * Exported as window.GeoDiff (ES6-compatible; no JSX, React, or module syntax).
 *
 * API:
 *   GeoDiff.splitSentences(text)           → string[]
 *   GeoDiff.fingerprintSentence(text)      → string
 *   GeoDiff.diffDescriptions(prev, next)   → { unchanged, added, removed, modified }
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // splitSentences
  // ---------------------------------------------------------------------------
  // Splits text on sentence boundaries.
  // Does NOT split on:
  //   - abbreviations: e.g., i.e., etc., Ma, m.y.a.
  //   - decimal numbers: 45.5
  // DOES split on: . ! ? followed by whitespace then an uppercase letter,
  //                and on newlines (treating each non-empty line as a sentence).

  /**
   * @param {string} text
   * @returns {string[]}
   */
  function splitSentences(text) {
    if (!text || !text.trim()) return [];

    // Normalise line endings
    var normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split on newlines first; each line may itself contain multiple sentences.
    var lines = normalized.split('\n');
    var sentences = [];

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li].trim();
      if (!line) continue;

      // Now split this line on sentence-terminating punctuation followed by whitespace
      // and an uppercase letter, but NOT for known abbreviations or decimals.
      var parts = splitOnSentenceTerminators(line);
      for (var pi = 0; pi < parts.length; pi++) {
        var s = parts[pi].trim();
        if (s) sentences.push(s);
      }
    }

    return sentences;
  }

  /**
   * Split a single line on sentence terminators, respecting abbreviations and decimals.
   * @param {string} line
   * @returns {string[]}
   */
  function splitOnSentenceTerminators(line) {
    // Strategy: walk through the string, collecting characters.
    // When we hit . ! or ? we check whether it's a real sentence boundary.
    var result = [];
    var current = '';
    var i = 0;

    while (i < line.length) {
      var ch = line[i];

      if (ch === '.' || ch === '!' || ch === '?') {
        // Grab the punctuation (may be multiple: "!?" or "...")
        var punct = ch;
        var j = i + 1;
        while (j < line.length && (line[j] === '.' || line[j] === '!' || line[j] === '?')) {
          punct += line[j];
          j++;
        }

        current += punct;

        // Now check if what follows is whitespace + uppercase → candidate boundary.
        // Consume whitespace
        var spaceStart = j;
        while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
          j++;
        }
        var spaceLen = j - spaceStart;

        if (spaceLen > 0 && j < line.length && isUpperCase(line[j])) {
          // Candidate split — but check for abbreviations and decimals.
          if (!isSuppressedSplit(current, line, i)) {
            // Real sentence boundary
            result.push(current);
            current = '';
            i = j; // skip the whitespace; next char is the uppercase start
            continue;
          }
          // Suppressed: include the spaces we consumed
          current += line.slice(spaceStart, j);
          i = j;
          continue;
        }

        // Not a boundary — just include what we consumed
        current += line.slice(spaceStart, j);
        i = j;
        continue;
      }

      current += ch;
      i++;
    }

    if (current.trim()) result.push(current);
    return result;
  }

  /**
   * Returns true if the split at position `dotPos` in `accumulated` should be suppressed.
   * @param {string} accumulated  - text accumulated so far INCLUDING the punctuation
   * @param {string} line         - full original line (for decimal look-ahead)
   * @param {number} dotPos       - position of the '.' in `line`
   */
  function isSuppressedSplit(accumulated, line, dotPos) {
    // 1. Decimal number: digit before dot, digit after dot
    //    e.g. "45.5" — dotPos points to the '.', check line[dotPos-1] and line[dotPos+1]
    if (dotPos > 0 && dotPos + 1 < line.length) {
      var before = line[dotPos - 1];
      var after = line[dotPos + 1];
      if (isDigit(before) && isDigit(after)) return true;
    }

    // 2. Known abbreviations (case-insensitive match at end of accumulated word)
    //    Patterns: e.g.  i.e.  etc.  Ma.  m.y.a.
    //    We look at the accumulated text stripped of trailing punctuation.
    var abbrevs = ['e.g.', 'i.e.', 'etc.', 'Ma.', 'm.y.a.', 'e.g', 'i.e', 'etc'];
    var lower = accumulated.toLowerCase();
    for (var k = 0; k < abbrevs.length; k++) {
      var abbr = abbrevs[k].toLowerCase();
      if (lower.endsWith(abbr)) return true;
    }

    // 3. Single uppercase letter followed by dot (initials: "A. Smith" etc.)
    //    Suppress if the word before the dot is a single letter.
    var wordMatch = accumulated.match(/\b([A-Za-z])\.\s*$/);
    if (wordMatch && wordMatch[1].length === 1) return true;

    return false;
  }

  function isUpperCase(ch) {
    return ch >= 'A' && ch <= 'Z';
  }

  function isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  // ---------------------------------------------------------------------------
  // fingerprintSentence
  // ---------------------------------------------------------------------------
  /**
   * Returns a normalised fingerprint of a sentence.
   * Whitespace and case differences do NOT count as edits.
   * @param {string} text
   * @returns {string}
   */
  function fingerprintSentence(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------------------------------------------------------------------------
  // diffDescriptions
  // ---------------------------------------------------------------------------
  /**
   * Compare two description strings at the sentence level.
   *
   * @param {string} prev
   * @param {string} next
   * @returns {{
   *   unchanged: Array<{fingerprint: string, text: string}>,
   *   added:     Array<{fingerprint: string, text: string}>,
   *   removed:   Array<{fingerprint: string, text: string}>,
   *   modified:  Array<{before: {fingerprint: string, text: string}, after: {fingerprint: string, text: string}}>,
   * }}
   */
  function diffDescriptions(prev, next) {
    var prevSentences = splitSentences(prev || '');
    var nextSentences = splitSentences(next || '');

    var prevEntries = prevSentences.map(function (t) { return { fingerprint: fingerprintSentence(t), text: t }; });
    var nextEntries = nextSentences.map(function (t) { return { fingerprint: fingerprintSentence(t), text: t }; });

    // Build reference-count maps so duplicate sentences are handled correctly.
    // drainedNext is decremented as prev entries claim "unchanged" slots.
    // drainedPrev is decremented as next entries confirm those slots were consumed.
    var drainedPrev = Object.create(null);
    prevEntries.forEach(function (e) { drainedPrev[e.fingerprint] = (drainedPrev[e.fingerprint] || 0) + 1; });
    var drainedNext = Object.create(null);
    nextEntries.forEach(function (e) { drainedNext[e.fingerprint] = (drainedNext[e.fingerprint] || 0) + 1; });

    var unchanged = [];
    var candidateRemoved = [];
    var candidateAdded = [];

    // Walk prev: consume a slot in next if available (unchanged), else removed
    prevEntries.forEach(function (e) {
      if ((drainedNext[e.fingerprint] || 0) > 0) {
        unchanged.push(e);
        drainedNext[e.fingerprint]--;
      } else {
        candidateRemoved.push(e);
      }
    });

    // Walk next: consume a slot in prev if available (already counted as unchanged), else added
    nextEntries.forEach(function (e) {
      if ((drainedPrev[e.fingerprint] || 0) > 0) {
        drainedPrev[e.fingerprint]--;
      } else {
        candidateAdded.push(e);
      }
    });

    // Pair removed+added as "modified" if character similarity > 0.5
    var modified = [];
    var usedAdded = new Array(candidateAdded.length).fill(false);
    var removed = [];

    for (var ri = 0; ri < candidateRemoved.length; ri++) {
      var rem = candidateRemoved[ri];
      var bestSim = 0;
      var bestAi = -1;

      for (var ai = 0; ai < candidateAdded.length; ai++) {
        if (usedAdded[ai]) continue;
        var sim = charSimilarity(rem.text, candidateAdded[ai].text);
        if (sim > bestSim) {
          bestSim = sim;
          bestAi = ai;
        }
      }

      if (bestSim > 0.5 && bestAi >= 0) {
        modified.push({ before: rem, after: candidateAdded[bestAi] });
        usedAdded[bestAi] = true;
      } else {
        removed.push(rem);
      }
    }

    var added = candidateAdded.filter(function (_, ai) { return !usedAdded[ai]; });

    return { unchanged: unchanged, added: added, removed: removed, modified: modified };
  }

  /**
   * Character-level Jaccard similarity between two strings.
   * Uses bigrams (pairs of consecutive characters) for better sensitivity.
   * @param {string} a
   * @param {string} b
   * @returns {number} 0..1
   */
  function charSimilarity(a, b) {
    if (!a && !b) return 1;
    if (!a || !b) return 0;

    var aBigrams = getBigrams(a.toLowerCase());
    var bBigrams = getBigrams(b.toLowerCase());

    if (aBigrams.length === 0 && bBigrams.length === 0) return 1;
    if (aBigrams.length === 0 || bBigrams.length === 0) return 0;

    // Intersection count
    var aSet = Object.create(null);
    aBigrams.forEach(function (bg) { aSet[bg] = (aSet[bg] || 0) + 1; });

    var intersect = 0;
    var bCount = Object.create(null);
    bBigrams.forEach(function (bg) { bCount[bg] = (bCount[bg] || 0) + 1; });

    Object.keys(bCount).forEach(function (bg) {
      if (aSet[bg]) {
        intersect += Math.min(aSet[bg], bCount[bg]);
      }
    });

    var union = aBigrams.length + bBigrams.length - intersect;
    return union === 0 ? 1 : intersect / union;
  }

  function getBigrams(str) {
    var bigrams = [];
    for (var i = 0; i < str.length - 1; i++) {
      bigrams.push(str[i] + str[i + 1]);
    }
    return bigrams;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.GeoDiff = {
    splitSentences: splitSentences,
    fingerprintSentence: fingerprintSentence,
    diffDescriptions: diffDescriptions,
  };
})();
