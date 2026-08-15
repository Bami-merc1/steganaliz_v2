import type { Track } from '../types/curriculum';
import { WEEK_1_LESSONS } from './lessons/week1';
import { WEEK_2_LESSONS } from './lessons/week2';
import { WEEK_3_LESSONS } from './lessons/week3';
import { WEEK_4_LESSONS } from './lessons/week4';
import { WEEK_5_LESSONS } from './lessons/week5';
import { WEEK_6_LESSONS } from './lessons/week6';
import { WEEK_7_LESSONS } from './lessons/week7';
import { WEEK_8_LESSONS } from './lessons/week8';
import { WEEK_9_LESSONS } from './lessons/week9';
import { WEEK_10_LESSONS } from './lessons/week10';
import { WEEK_11_LESSONS } from './lessons/week11';
import { WEEK_12_LESSONS } from './lessons/week12';
import { WEEK_13_LESSONS } from './lessons/week13';
import { WEEK_14_LESSONS } from './lessons/week14';
import { WEEK_15_LESSONS } from './lessons/week15';

export const CURRICULUM: Track[] = [
  {
    id: 'phase-1',
    title: 'Phase 1: Foundations of Binary & File Architecture',
    level: 'beginner',
    modules: [
      { id: 'week-1', title: 'Week 1: Bitwise Computations & Machine Representation', description: 'Binary/hex/ASCII, bitwise operators, bit shifts, endianness.', lessons: WEEK_1_LESSONS },
      { id: 'week-2', title: 'Week 2: File Structure Anatomy & Magic Numbers', description: 'File signatures, headers/chunks/metadata/footers, stream vs. chunk files.', lessons: WEEK_2_LESSONS },
      { id: 'week-3', title: 'Week 3: Storage Calculations & Forensics', description: 'Sectors vs. clusters, slack space, partition tables, filesystem structures.', lessons: WEEK_3_LESSONS },
      { id: 'week-4', title: 'Week 4: File Manipulation & Header Grafting', description: 'MIME vs. extension vs. magic number, polyglot files, metadata structures.', lessons: WEEK_4_LESSONS },
    ],
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Steganography — Data Embedding Methodologies',
    level: 'intermediate',
    modules: [
      { id: 'week-5', title: 'Week 5: Spatial Domain Steganography (LSB Core)', description: 'HVS limits, LSB substitution, histogram impact.', lessons: WEEK_5_LESSONS },
      { id: 'week-6', title: 'Week 6: Spatial Domain Optimization & PRNGs', description: 'Randomized LSB, CSPRNGs, Pixel Value Differencing.', lessons: WEEK_6_LESSONS },
      { id: 'week-7', title: 'Week 7: Transform Domain Steganography (JPEG & DCT)', description: 'DCT, quantization, Jsteg/F5.', lessons: WEEK_7_LESSONS },
      { id: 'week-8', title: 'Week 8: Audio & Network Steganography', description: 'HAS limits, WAV LSB/phase coding/echo hiding, TCP/IP field abuse.', lessons: WEEK_8_LESSONS },
      { id: 'week-9', title: 'Week 9: Structural Data Injection', description: 'EOF append, NTFS ADS, font/whitespace steganography.', lessons: WEEK_9_LESSONS },
    ],
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Steganalysis — Detection & Countermeasures',
    level: 'advanced',
    modules: [
      { id: 'week-10', title: 'Week 10: Visual Steganalysis & Structural Breakdown', description: 'Bitplane isolation, artificial entropy, visual attacks.', lessons: WEEK_10_LESSONS },
      { id: 'week-11', title: 'Week 11: Statistical Steganalysis — The Chi-Square Test', description: 'Pairs of Values, the flattening effect, chi-square goodness-of-fit.', lessons: WEEK_11_LESSONS },
      { id: 'week-12', title: 'Week 12: Advanced Steganalysis (RS Analysis)', description: 'Regular-Singular analysis, dual-masking, payload length estimation.', lessons: WEEK_12_LESSONS },
      { id: 'week-13', title: 'Week 13: File Scrapers, Carvers, & Frameworks', description: 'Heuristic carving, Binwalk/Scalpel, signature databases.', lessons: WEEK_13_LESSONS },
      { id: 'week-14', title: 'Week 14: Machine Learning in Steganalysis', description: 'SRM feature extraction, CNN classification.', lessons: WEEK_14_LESSONS },
    ],
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Final Evaluation',
    level: 'advanced',
    modules: [
      { id: 'week-15', title: 'Week 15: Capstone Matrix Presentation', description: 'Theoretical exam + CTF-style disk image forensic capstone.', lessons: WEEK_15_LESSONS },
    ],
  },
];