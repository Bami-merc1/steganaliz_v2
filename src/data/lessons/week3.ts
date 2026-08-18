import type { Lesson } from '../../types/curriculum';

export const WEEK_3_LESSONS: Lesson[] = [
  {
    id: 'w3-sectors-clusters',
    title: 'Physical Sectors vs. Logical Clusters/Blocks',
    summary: 'The layer beneath the file - how storage hardware and filesystems actually allocate space.',
    estimatedMinutes: 25,
    content: `
## Two different granularities

Everything up to now has treated a file as "just bytes." That's true from an application's point of view, but underneath the filesystem, storage devices don't write single bytes at a time - they operate in fixed-size chunks.

### The sector: hardware's unit

A **sector** is the smallest unit a physical (or virtual) storage device reads or writes at once. Traditional hard drives used 512-byte sectors for decades; modern drives (and SSDs) commonly use 4096-byte (4KB) "Advanced Format" sectors. You cannot instruct a drive to write 10 bytes in isolation - it reads or writes the entire containing sector, even to change one byte within it.

### The cluster (or block): the filesystem's unit

Filesystems group multiple sectors into a **cluster** (NTFS terminology) or **block** (ext4/Unix terminology) - the smallest unit the *filesystem* allocates to a file, typically 4KB by default, though this is configurable at format time (larger clusters trade wasted space for better performance on large files; smaller clusters do the reverse).

\`\`\`
Disk layout (simplified):
[ Sector ][ Sector ][ Sector ][ Sector ][ Sector ][ Sector ][ Sector ][ Sector ]
[========== Cluster (4KB) ============][========== Cluster (4KB) ============]
\`\`\`

## Why this mismatch matters: internal fragmentation

If a cluster size is 4096 bytes and you save a file that's only 10 bytes long, the filesystem still allocates one **entire cluster** to that file - the other 4086 bytes of that cluster are reserved and unusable by any other file, but also not actually occupied by your file's data. This wasted space is called **internal fragmentation**, and it's a direct mathematical consequence of allocation granularity.

## Worked example: computing wasted space

A file is 10,000 bytes, on a filesystem with a 4096-byte cluster size.

\`\`\`
Clusters needed = ceil(10,000 / 4096) = ceil(2.44) = 3 clusters
Allocated space  = 3 × 4096 = 12,288 bytes
Wasted space     = 12,288 - 10,000 = 2,288 bytes
\`\`\`

That trailing 2,288 bytes - allocated to the file but not overwritten by its actual content - is called **slack space**, and it's the subject of the next lesson: it isn't zeroed out by most filesystems, meaning it can contain **leftover fragments of whatever was previously stored in that physical location on disk** - a significant forensic and steganographic vector.

## Why your browser-based project doesn't (and can't) touch this layer

It's worth being explicit about scope here: Steganaliz operates entirely within the browser sandbox on \`File\`/\`Blob\` objects - it has zero access to raw disk sectors, filesystem metadata, or slack space, because browsers deliberately prevent web pages from reading arbitrary disk regions (this is a fundamental, non-negotiable security boundary, not a missing feature). Everything in this lesson and the next is genuine, important forensic knowledge - but demonstrating it practically requires OS-level or disk-image-level tooling (Python with raw disk access, or forensic suites like Autopsy/FTK) outside what a web app is permitted to do. This is why your project's doc scope correctly focuses on file-level steganography rather than disk-level forensics.

## Check your understanding

- A filesystem uses 512-byte clusters instead of 4096-byte clusters. Recompute the slack space for the same 10,000-byte file. What's the general relationship between cluster size and wasted space per file?
- Why might an OS deliberately choose a *larger* default cluster size for a drive that mostly stores large video files, despite the fragmentation cost this lesson describes?
`,
  },
  {
    id: 'w3-slack-space',
    title: 'Mathematical proof of slack space allocations',
    summary: 'Formalizing slack space, and why it matters to digital forensics.',
    estimatedMinutes: 20,
    content: `
## Formalizing the slack space formula

Given a file of size \`F\` bytes and a cluster size \`C\` bytes, the number of clusters allocated is:

\`\`\`
clusters = ⌈F / C⌉        (ceiling division - you always round UP to a whole cluster)


A useful bound: slack space is always **strictly less than one full cluster** (\`0 ≤ slack < C\`), except in the special case where \`F\` is an exact multiple of \`C\`, giving \`slack = 0\`. This means average slack space per file, across many randomly-sized files, converges toward roughly \`C/2\` - which is why forensic analysts care about cluster size at all: on a drive with millions of small files, this "wasted but present" space adds up to a meaningful forensic surface area.

## Two distinct kinds of slack space

It's worth distinguishing these, since forensic literature uses both terms precisely:

**RAM slack**: the gap between the end of the file's actual data and the end of the *last sector* it occupies. On older systems, this space could literally contain fragments of whatever was in RAM at the moment the sector was written - a genuine historical source of accidental data leakage.

**Drive slack** (or **file slack**): the gap between the end of the last *sector actually used* and the end of the *cluster* it belongs to (since a cluster can span multiple sectors). This is the larger of the two, and it's where remnants of a *previous file* that occupied that cluster before being deleted can persist.

\`\`\`
[===== sector 1 (used) =====][===== sector 2 (used) =====][=== sector 3 ===]
[============ File data =====================][RAM slack][==== drive slack ====]
[<---------------------------- one cluster (spans 3 sectors) ---------------->]
\`\`\`

## Why deleted files aren't really gone

When a file is deleted through normal OS mechanisms, the filesystem typically only removes the *reference* to that file (its entry in the directory table / MFT) and marks its clusters as "available for reuse." **The actual bytes remain physically present on disk** until a new file happens to be written into those same clusters - and even then, only the portion actually overwritten by the new file is lost; anything beyond the new file's length, within the same cluster, persists as slack space belonging to the new file.

This is the foundational principle behind forensic "file carving" (which you'll formalize in Week 13) and behind why properly destroying sensitive data requires secure-erase tools that explicitly overwrite storage, not just OS-level deletion.

## Check your understanding

- If a 4097-byte file is stored with a 4096-byte cluster size, how many clusters does it require, and what is the exact slack space in bytes? (Work through the formula above before checking: \`⌈4097/4096⌉ = 2\` clusters, \`allocated = 8192\`, \`slack = 8192 − 4097 = 4095\` bytes - nearly an entire wasted cluster, from just 1 byte crossing the boundary.)
- Why does the "deleted files aren't really gone" principle mean that simply deleting a file containing an embedded steganographic payload is not, by itself, a reliable way to destroy evidence of that payload?
`,
  },
  {
    id: 'w3-partition-tables-filesystems',
    title: 'Partition tables (MBR vs. GPT) and filesystem structures (NTFS/ext4)',
    summary: 'How a raw disk is divided into partitions, and how a filesystem tracks what\'s where within one.',
    estimatedMinutes: 25,
    content: `
## Partition tables: dividing the disk

Before any filesystem exists, a disk needs a **partition table** - a small, fixed-location data structure describing how the disk is divided into separate regions ("partitions"), each of which can later be formatted with its own filesystem (this is how you get a \`C:\` drive and a separate recovery partition, or a Linux \`/boot\` partition and a separate \`/\` partition, on one physical disk).

### MBR (Master Boot Record) - the legacy standard

Lives in the disk's very first sector (sector 0, historically 512 bytes). Structure:

\`\`\`
Bytes 0–445:   Boot loader code
Bytes 446–509: 4 partition table entries, 16 bytes each
Bytes 510–511: Boot signature (0x55 0xAA - itself a kind of magic number!)
\`\`\`

MBR's hard limit of **4 partition entries** (extendable to more via "extended partitions," a somewhat awkward workaround) and its **2 TB maximum addressable disk size** (a consequence of using 32-bit sector addressing) are why it's been largely superseded.

### GPT (GUID Partition Table) - the modern standard

Supports up to 128 partitions by default, disks up to 8 ZB (zettabytes - effectively no practical limit today), and critically, **stores a backup copy of itself at the end of the disk**, plus CRC32 checksums over its own structures - meaning GPT can detect and, in many cases, recover from partition table corruption, something MBR has no mechanism for at all.

## Filesystem structures: tracking what's inside a partition

Once a partition exists, a filesystem organizes the *files* within it. Two dominant real-world examples, with structurally different approaches to the same problem:

### NTFS (Windows) - the Master File Table (MFT)

NTFS tracks **every single file and directory** as a record in a central table called the **MFT**. Each MFT record is a fixed size (typically 1KB) and contains the file's metadata (timestamps, permissions, size) plus either the actual file data directly (for very small files - "resident" data) or pointers to the clusters where the data actually lives (for larger files - "non-resident" data).

This "resident data" behavior is directly relevant to this course's polyglot lecture in Week 4: a small enough hidden payload can sometimes live entirely *inside the MFT record itself*, never touching normal cluster allocation at all - which is one reason small hidden files are especially hard to find with naive cluster-scanning approaches.

### ext4 (Linux) - inodes

ext4 (and Unix filesystems generally) uses a different core structure: an **inode** - a data structure holding a file's metadata (permissions, timestamps, size) and pointers to the data blocks containing its content. Critically, in Unix filesystem design, **the filename itself is not stored in the inode** - it's stored separately, in the containing directory's own data, as a mapping from name → inode number. This is why Unix systems allow multiple filenames (hard links) to point to the exact same underlying file content: they're different directory entries referencing the same inode.

## Why this matters for steganography and forensics broadly

Both structures - MFT and inode tables - are themselves just more file-format-like binary structures, subject to everything you learned in Weeks 1–2: they have their own headers, their own fixed-size records, and their own conventions that a forensic tool must parse correctly to reconstruct "what files exist on this disk" independent of what the OS's normal file-browsing APIs report. This is the foundation of disk forensics tools like Autopsy and \`sleuthkit\`, and it's why a sufficiently thorough forensic investigation doesn't just "look at the files" - it parses the filesystem's own bookkeeping structures directly, because a sophisticated attacker can manipulate what the OS reports without necessarily being able to hide from someone reading the raw structures.

## Check your understanding

- Why does GPT's self-checksumming design make it inherently more forensically trustworthy than MBR, independent of its larger size limits?
- If an inode's metadata doesn't store the filename, what would happen to a file's data if every directory entry (hard link) pointing to that inode were deleted, but a program still had the file open at that moment? (This is a genuine, well-known Unix behavior worth researching if you're unsure - it directly reflects the inode/filename separation described above.)
`,
  },
];