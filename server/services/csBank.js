// CS Fundamentals curriculum: lessons + quiz questions, written for this app (general, widely taught computer-science material).
// Not company data and not "real interview questions". Student progress is stored in MongoDB (CsAttempt, CsProgress).
const Q = (q, options, answer, explain) => ({ q, options, answer, explain });

const SUBJECTS = [
  { id: 'oop', name: 'Object-Oriented Programming', blurb: 'Classes, inheritance, polymorphism and design principles.' },
  { id: 'dbms', name: 'DBMS', blurb: 'Keys, normalization, transactions and indexing.' },
  { id: 'sql', name: 'SQL', blurb: 'Querying, joins and common advanced features.' },
  { id: 'os', name: 'Operating Systems', blurb: 'Processes, scheduling, synchronization and memory.' },
  { id: 'cn', name: 'Computer Networks', blurb: 'Layers, TCP/UDP, HTTP, DNS and addressing.' }
];

const LESSONS = [
  // ---------------- OOP ----------------
  {
    id: 'oop-basics', subject: 'oop', title: 'Classes, objects, encapsulation and abstraction', minutes: 12, level: 'Beginner',
    summary: 'The building blocks of object-oriented code.',
    body: `A **class** is a blueprint: it defines data (fields) and behaviour (methods). An **object** is one instance created from that blueprint, with its own field values.

**Encapsulation** means bundling data with the methods that work on it and hiding the internal details. Fields are usually private and changed only through methods, so the class can protect its own rules (for example, a balance can never become negative). It is a way to keep an object in a valid state.

**Abstraction** means exposing only what a user of the class needs and hiding how it is done. You call \`list.sort()\` without knowing which algorithm runs. Abstraction is about the *interface*; encapsulation is about *protecting the data*. Interviewers often ask for the difference.

A **constructor** runs when an object is created and sets the initial state. **Static** members belong to the class itself, not to any single object.`,
    keyPoints: ['Class = blueprint, object = instance', 'Encapsulation hides data and guards its rules', 'Abstraction hides complexity behind a simple interface', 'Static members belong to the class'],
    questions: [
      Q('What is an object?', ['A blueprint that defines fields and methods', 'An instance created from a class', 'A file that stores a class', 'A method that returns a value'], 1, 'A class is the blueprint; an object is a concrete instance of it with its own state.'),
      Q('Making fields private and exposing getter/setter methods mainly demonstrates which concept?', ['Inheritance', 'Polymorphism', 'Encapsulation', 'Recursion'], 2, 'Encapsulation keeps data hidden and lets the class control how it is read and changed.'),
      Q('Which statement best describes abstraction?', ['Hiding implementation details and showing only essential features', 'Creating a new class from an existing class', 'Allowing one method name to have many forms', 'Storing data in a database'], 0, 'Abstraction exposes what an object does while hiding how it does it.'),
      Q('A static method belongs to:', ['Each object separately', 'The class itself', 'Only the child classes', 'The constructor'], 1, 'Static members are shared at class level and can be called without creating an object.')
    ]
  },
  {
    id: 'oop-inherit-poly', subject: 'oop', title: 'Inheritance and polymorphism', minutes: 14, level: 'Beginner',
    summary: 'Reusing code and treating different objects through one interface.',
    body: `**Inheritance** lets a child class reuse and extend the fields and methods of a parent class (an "is-a" relationship: a Dog *is an* Animal). It supports code reuse, but deep hierarchies become hard to change.

**Polymorphism** means "many forms": the same call behaves differently depending on the object.
- **Compile-time (static) polymorphism** = method **overloading**: same name, different parameter lists, resolved by the compiler.
- **Run-time (dynamic) polymorphism** = method **overriding**: a child class provides its own version of a parent method; the version that runs is chosen from the *actual object type* when the program runs.

Overloading changes the parameters; overriding keeps the same signature in a subclass. A parent-type variable can hold a child object (\`Animal a = new Dog();\`) and \`a.speak()\` runs the Dog version.

Some languages (Java, C#) do not allow a class to inherit from two classes (to avoid the diamond problem) but allow implementing several interfaces. C++ and Python allow multiple inheritance.`,
    keyPoints: ['Inheritance = is-a reuse', 'Overloading: same name, different parameters (compile time)', 'Overriding: subclass redefines parent method (run time)', 'Parent reference can point to a child object'],
    questions: [
      Q('Method overriding is an example of:', ['Compile-time polymorphism', 'Run-time polymorphism', 'Encapsulation', 'Data hiding'], 1, 'Which overridden method runs is decided at run time from the actual object type.'),
      Q('Which pair differs only in their parameter lists?', ['Overriding', 'Overloading', 'Overwriting', 'Shadowing a class'], 1, 'Overloading uses the same method name with different parameters.'),
      Q('Inheritance models which kind of relationship?', ['has-a', 'uses-a', 'is-a', 'knows-a'], 2, 'A child class "is a" specialised kind of its parent. "Has-a" is composition.'),
      Q('Given `Animal a = new Dog();` and Dog overrides speak(), what does `a.speak()` run (in Java-style languages)?', ['Animal\'s speak()', 'Dog\'s speak()', 'It fails to compile', 'Both versions'], 1, 'Dynamic dispatch picks the method of the actual object (Dog).')
    ]
  },
  {
    id: 'oop-design', subject: 'oop', title: 'SOLID, composition and interfaces', minutes: 15, level: 'Intermediate',
    summary: 'Design principles that interviewers ask about.',
    body: `**SOLID** is a set of five design guidelines:
- **S**ingle Responsibility: a class should have one reason to change.
- **O**pen/Closed: open for extension, closed for modification (add behaviour without editing tested code).
- **L**iskov Substitution: a subclass must work wherever its parent is expected, without breaking the program.
- **I**nterface Segregation: prefer several small interfaces over one large one.
- **D**ependency Inversion: depend on abstractions, not concrete classes.

**Composition over inheritance**: build behaviour by holding other objects ("has-a") instead of extending a class. It is more flexible and avoids fragile hierarchies.

**Abstract class vs interface**: an abstract class can hold state and partly implemented methods, and a class can extend only one. An interface describes a contract (what, not how) and a class can implement many. Use an interface to describe a capability (Comparable), an abstract class for a shared base with common code.`,
    keyPoints: ['SOLID = SRP, OCP, LSP, ISP, DIP', 'Prefer composition to deep inheritance', 'Interface = contract; abstract class = partial implementation + state'],
    questions: [
      Q('A class that handles database access, formatting and emailing violates which principle most clearly?', ['Single Responsibility', 'Liskov Substitution', 'Interface Segregation', 'Open/Closed'], 0, 'It has several reasons to change. Split it into focused classes.'),
      Q('The Liskov Substitution Principle says:', ['Classes should be small', 'Subclasses must be usable wherever the parent is expected', 'Depend on concrete classes', 'Never use interfaces'], 1, 'Replacing a parent object with a child object must not break correctness.'),
      Q('Which is a typical difference between an abstract class and an interface (in Java-like languages)?', ['A class can extend many abstract classes', 'An abstract class can hold instance state; an interface describes a contract', 'Interfaces can have constructors', 'Abstract classes cannot have methods'], 1, 'Abstract classes can keep fields and shared code, and only one can be extended.'),
      Q('"Favour composition over inheritance" means:', ['Avoid objects completely', 'Build behaviour by combining objects instead of extending classes', 'Always use multiple inheritance', 'Make all classes final'], 1, 'Holding collaborators ("has-a") is more flexible than a rigid "is-a" hierarchy.')
    ]
  },
  // ---------------- DBMS ----------------
  {
    id: 'dbms-keys-normal', subject: 'dbms', title: 'Keys and normalization', minutes: 15, level: 'Beginner',
    summary: 'How tables are identified and how redundancy is removed.',
    body: `A **super key** is any set of columns that uniquely identifies a row. A **candidate key** is a minimal super key (no column can be removed). The **primary key** is the candidate key chosen to identify rows (not NULL, unique). A **foreign key** is a column that refers to the primary key of another table and enforces referential integrity. A **composite key** uses more than one column.

**Normalization** reduces redundancy and update anomalies by splitting tables.
- **1NF**: every cell holds a single atomic value; no repeating groups.
- **2NF**: 1NF + no *partial* dependency (a non-key column must depend on the whole composite key).
- **3NF**: 2NF + no *transitive* dependency (non-key columns must not depend on other non-key columns).
- **BCNF**: for every dependency X → Y, X must be a super key.

Anomalies it prevents: **insertion** (cannot add data without other data), **update** (same fact stored in many rows), **deletion** (deleting a row loses unrelated facts). Over-normalizing can slow reads because of many joins, so some systems denormalize on purpose.`,
    keyPoints: ['Candidate key = minimal super key', 'Foreign key enforces references', '1NF atomic, 2NF no partial dependency, 3NF no transitive dependency', 'Normalization removes anomalies; denormalization trades it for read speed'],
    questions: [
      Q('Which statement about a primary key is TRUE?', ['It may contain NULL values', 'It uniquely identifies each row and cannot be NULL', 'A table can have several primary keys', 'It must be a single column'], 1, 'A primary key is unique and NOT NULL. It may be composite, and a table has only one.'),
      Q('A table where one column stores values like "Math, Physics" violates which normal form?', ['1NF', '2NF', '3NF', 'BCNF'], 0, 'First normal form requires atomic values in each cell.'),
      Q('A transitive dependency (non-key → non-key) is removed to reach:', ['1NF', '2NF', '3NF', 'Unnormalized form'], 2, 'Third normal form removes transitive dependencies on the key.'),
      Q('A foreign key is used to:', ['Speed up every query', 'Link a row to a row in another table and keep references valid', 'Encrypt a column', 'Store duplicate data'], 1, 'It enforces referential integrity between tables.')
    ]
  },
  {
    id: 'dbms-transactions', subject: 'dbms', title: 'Transactions, ACID and isolation', minutes: 16, level: 'Intermediate',
    summary: 'How databases stay correct under failures and concurrency.',
    body: `A **transaction** is a group of operations treated as one unit. **ACID**:
- **Atomicity**: all operations happen or none do (rollback on failure).
- **Consistency**: a transaction moves the database from one valid state to another (constraints hold).
- **Isolation**: concurrent transactions do not see each other's half-finished work.
- **Durability**: once committed, data survives crashes (written to a log/disk).

Concurrency problems:
- **Dirty read**: reading uncommitted data of another transaction.
- **Non-repeatable read**: reading the same row twice and getting different values.
- **Phantom read**: re-running a query and seeing new rows.

**Isolation levels** (weakest to strongest): Read Uncommitted, Read Committed, Repeatable Read, Serializable. Stronger isolation prevents more anomalies but reduces concurrency. Exact behaviour differs slightly between database products.

**Locks** (shared/exclusive) and **MVCC** (multi-version concurrency control) are the usual ways to implement isolation. A **deadlock** happens when transactions wait for each other's locks; the database detects it and aborts one.`,
    keyPoints: ['ACID = Atomicity, Consistency, Isolation, Durability', 'Dirty, non-repeatable and phantom reads', 'Higher isolation = fewer anomalies, less concurrency', 'Deadlock: database aborts one transaction'],
    questions: [
      Q('A bank transfer debits one account and then the system crashes before crediting the other. Rolling back everything demonstrates:', ['Durability', 'Atomicity', 'Isolation', 'Normalization'], 1, 'Atomicity: all or nothing.'),
      Q('Reading data written by another transaction that has not committed yet is called a:', ['Phantom read', 'Dirty read', 'Lost index', 'Deadlock'], 1, 'That is a dirty read; Read Committed and above prevent it.'),
      Q('Which isolation level is the strictest?', ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'], 3, 'Serializable behaves as if transactions ran one after another.'),
      Q('Durability guarantees that:', ['Transactions run faster', 'Committed changes survive a crash', 'Two users never conflict', 'Tables are normalized'], 1, 'Committed data is persisted (for example via a write-ahead log).')
    ]
  },
  {
    id: 'dbms-indexing', subject: 'dbms', title: 'Indexing', minutes: 12, level: 'Intermediate',
    summary: 'Why queries get faster with indexes and what they cost.',
    body: `An **index** is a separate structure that lets the database find rows without scanning the whole table, like the index at the back of a book. Most relational databases use a **B-tree (or B+ tree)**: balanced, sorted, so lookups, range queries and ordering take about O(log n). **Hash indexes** are fast for exact equality but cannot do ranges.

A **clustered index** decides the physical order of rows (one per table; in many engines the primary key). A **non-clustered (secondary) index** is a separate structure pointing back to the rows.

Costs: indexes use disk space and make **INSERT/UPDATE/DELETE slower** because the index must also be updated. Add indexes for columns used often in WHERE, JOIN and ORDER BY, especially those with many distinct values (high selectivity). Columns with only a few distinct values (like a yes/no flag) benefit little.

A **composite index** on (a, b) helps queries filtering on a, or on a and b, but generally not on b alone (the "leftmost prefix" rule).`,
    keyPoints: ['B-tree index: O(log n) lookups, range-friendly', 'Indexes slow writes and use space', 'Composite index follows the leftmost-prefix rule', 'High-selectivity columns benefit most'],
    questions: [
      Q('Which structure do most relational databases use for indexes?', ['Linked list', 'B-tree / B+ tree', 'Stack', 'Queue'], 1, 'B-trees keep keys sorted and balanced for fast search and range scans.'),
      Q('A disadvantage of adding many indexes is:', ['Reads become impossible', 'Writes (insert/update/delete) get slower and storage grows', 'Tables cannot be joined', 'Primary keys stop working'], 1, 'Every write must also update each index.'),
      Q('With a composite index on (city, age), which query can use it best?', ['WHERE age = 20', 'WHERE city = \'Pune\'', 'WHERE name = \'Asha\'', 'None of them'], 1, 'The leftmost column (city) must be used for the index to help.'),
      Q('An index on which column is likely the LEAST useful?', ['email (unique per user)', 'order_id', 'is_active (only true/false)', 'phone_number'], 2, 'A column with just two values has low selectivity; the index barely narrows the search.')
    ]
  },
  // ---------------- SQL ----------------
  {
    id: 'sql-basics', subject: 'sql', title: 'SELECT, WHERE, GROUP BY and HAVING', minutes: 12, level: 'Beginner',
    summary: 'The core of every SQL query and its logical order.',
    body: `A query is *written* as SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... but *evaluated* in this logical order: **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT**. That is why you cannot use a SELECT alias inside WHERE in standard SQL.

- **WHERE** filters individual rows *before* grouping.
- **GROUP BY** collapses rows into groups; aggregate functions (COUNT, SUM, AVG, MIN, MAX) work per group.
- **HAVING** filters groups *after* aggregation (WHERE cannot use aggregates).
- **DISTINCT** removes duplicate rows. \`COUNT(*)\` counts rows; \`COUNT(col)\` skips NULLs.
- **NULL** means unknown: use \`IS NULL\`, not \`= NULL\`. Any comparison with NULL is unknown, not true.

Example: \`SELECT dept, AVG(salary) FROM emp WHERE active = 1 GROUP BY dept HAVING AVG(salary) > 50000 ORDER BY dept;\``,
    keyPoints: ['Logical order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY', 'WHERE filters rows, HAVING filters groups', 'COUNT(col) ignores NULLs', 'Use IS NULL'],
    questions: [
      Q('Which clause can filter on an aggregate such as COUNT(*) > 5?', ['WHERE', 'HAVING', 'FROM', 'DISTINCT'], 1, 'HAVING is applied after grouping and may use aggregate functions.'),
      Q('What does COUNT(column_name) do with NULL values?', ['Counts them', 'Ignores them', 'Raises an error', 'Treats them as zero'], 1, 'COUNT(column) counts only non-NULL values; COUNT(*) counts rows.'),
      Q('Which condition correctly finds rows with a missing phone number?', ['phone = NULL', 'phone == NULL', 'phone IS NULL', 'phone = \'\' only'], 2, 'NULL comparisons need IS NULL / IS NOT NULL.'),
      Q('Which clause is evaluated FIRST?', ['SELECT', 'WHERE', 'FROM', 'ORDER BY'], 2, 'FROM (with joins) is evaluated first to decide which rows exist.')
    ]
  },
  {
    id: 'sql-joins', subject: 'sql', title: 'Joins', minutes: 14, level: 'Beginner',
    summary: 'Combining rows from several tables.',
    body: `A **join** combines rows from two tables using a condition.
- **INNER JOIN**: only rows that match in both tables.
- **LEFT JOIN**: all rows from the left table; matching rows from the right, or NULLs when there is no match. Use it to find "customers with no orders" (\`WHERE o.id IS NULL\`).
- **RIGHT JOIN**: the mirror image of LEFT JOIN.
- **FULL OUTER JOIN**: all rows from both sides (not available in MySQL directly).
- **CROSS JOIN**: every row with every row (n × m rows).
- **SELF JOIN**: a table joined with itself, for example employee and manager in one table.

Pitfall: putting a filter on the right table in WHERE (instead of ON) turns a LEFT JOIN into an INNER JOIN, because the NULL rows are filtered out. Joining on a column with duplicates multiplies rows.`,
    keyPoints: ['INNER = matches only; LEFT keeps all left rows', 'LEFT JOIN + IS NULL finds unmatched rows', 'Self join for hierarchies', 'Filter in ON vs WHERE matters for outer joins'],
    questions: [
      Q('Table A has 5 rows, table B has 4 rows. A CROSS JOIN returns how many rows?', ['9', '20', '5', '4'], 1, 'A cross join pairs every row with every row: 5 × 4 = 20.'),
      Q('Which join returns all rows from the left table even when there is no match on the right?', ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'None'], 1, 'LEFT JOIN keeps unmatched left rows and fills the right side with NULL.'),
      Q('To list customers who have NEVER placed an order you would typically use:', ['INNER JOIN with WHERE o.id IS NULL', 'LEFT JOIN customers to orders WHERE o.id IS NULL', 'CROSS JOIN', 'UNION'], 1, 'The LEFT JOIN keeps all customers; rows with no order have a NULL order id.'),
      Q('Finding each employee together with their manager\'s name from a single employees table needs a:', ['Self join', 'Cross join only', 'Full text search', 'View'], 0, 'Join the table to itself using manager_id = id.')
    ]
  },
  {
    id: 'sql-advanced', subject: 'sql', title: 'Subqueries, window functions and common differences', minutes: 16, level: 'Intermediate',
    summary: 'Frequently asked intermediate SQL topics.',
    body: `A **subquery** is a query inside another query (in WHERE, FROM or SELECT). A **correlated subquery** refers to the outer query and runs per outer row, which can be slow. Many can be rewritten as joins.

**Window functions** compute over a set of rows related to the current row *without collapsing them*: \`ROW_NUMBER()\`, \`RANK()\`, \`DENSE_RANK()\`, \`SUM(x) OVER (PARTITION BY dept ORDER BY d)\`. Difference: ROW_NUMBER gives unique numbers; RANK leaves gaps after ties (1,1,3); DENSE_RANK has no gaps (1,1,2). "Second highest salary" is classically solved with DENSE_RANK or a subquery.

Common differences:
- **DELETE** removes chosen rows (can have WHERE, can roll back, fires triggers). **TRUNCATE** removes all rows quickly (no WHERE; rollback behaviour depends on the database). **DROP** removes the whole table.
- **UNION** removes duplicates; **UNION ALL** keeps them and is faster.
- **WHERE vs HAVING**, **char vs varchar**, **primary vs unique key** (unique allows NULL in many databases).`,
    keyPoints: ['Window functions keep all rows', 'RANK has gaps, DENSE_RANK does not', 'DELETE vs TRUNCATE vs DROP', 'UNION removes duplicates, UNION ALL does not'],
    questions: [
      Q('Salaries 100, 100, 90 ranked with DENSE_RANK() descending give:', ['1, 2, 3', '1, 1, 3', '1, 1, 2', '1, 2, 2'], 2, 'DENSE_RANK has no gaps after ties. RANK would give 1, 1, 3.'),
      Q('Which statement removes the whole table definition along with its data?', ['DELETE', 'TRUNCATE', 'DROP', 'REMOVE ROWS'], 2, 'DROP TABLE deletes the table itself.'),
      Q('UNION ALL differs from UNION because it:', ['Removes duplicates', 'Keeps duplicates and is usually faster', 'Only works on one table', 'Sorts the result'], 1, 'UNION must remove duplicates, which costs extra work.'),
      Q('What is special about a window function such as SUM(x) OVER (PARTITION BY dept)?', ['It collapses rows into one per dept', 'It computes per group but keeps every row', 'It only works with GROUP BY', 'It deletes duplicates'], 1, 'Unlike GROUP BY, window functions do not collapse rows.')
    ]
  },
  // ---------------- OS ----------------
  {
    id: 'os-process-thread', subject: 'os', title: 'Processes and threads', minutes: 13, level: 'Beginner',
    summary: 'The units of execution and how they differ.',
    body: `A **process** is a running program with its own address space (code, heap, stack) and resources. A **thread** is a unit of execution inside a process; threads of one process **share** code, heap and open files but each has its own stack and registers.

Creating a thread and switching between threads is cheaper than for processes, and threads communicate easily through shared memory, but that sharing can cause **race conditions**. A crash in one process normally does not affect another; a crash in one thread can bring down the whole process.

**Process states**: new, ready, running, waiting (blocked), terminated. A **context switch** saves the state of one task (registers, program counter) and loads another; it is pure overhead. The OS stores that state in a **Process Control Block (PCB)**.

**IPC (inter-process communication)**: pipes, message queues, shared memory, sockets.`,
    keyPoints: ['Threads share heap/code; each has own stack', 'Process = isolated address space', 'Context switch saves/restores state via PCB', 'IPC: pipes, queues, shared memory, sockets'],
    questions: [
      Q('Which resource is NOT shared between threads of the same process?', ['Heap memory', 'Open files', 'Stack', 'Global variables'], 2, 'Each thread has its own stack and registers.'),
      Q('The data structure the OS uses to store a process\'s state is the:', ['Page table only', 'Process Control Block', 'File allocation table', 'Semaphore'], 1, 'The PCB holds registers, program counter, state and more.'),
      Q('Compared with process switching, thread switching is generally:', ['More expensive', 'Cheaper', 'Impossible', 'The same cost'], 1, 'Threads share the address space, so less state must be swapped.'),
      Q('A process waiting for an I/O operation to finish is in which state?', ['Running', 'Ready', 'Waiting (blocked)', 'Terminated'], 2, 'It cannot run until the I/O completes, so it is blocked.')
    ]
  },
  {
    id: 'os-scheduling', subject: 'os', title: 'CPU scheduling', minutes: 14, level: 'Intermediate',
    summary: 'How the OS decides which process runs next.',
    body: `The **scheduler** picks which ready process gets the CPU. Goals: high CPU utilization and throughput, low waiting and turnaround time, fairness.

- **FCFS** (first come, first served): simple, non-preemptive; a long job delays everyone (**convoy effect**).
- **SJF** (shortest job first): minimum average waiting time among non-preemptive schedules, but needs burst times and can **starve** long jobs. Preemptive version = SRTF.
- **Priority scheduling**: run the highest priority first; starvation is solved by **aging** (raise priority over time).
- **Round Robin**: each process gets a fixed **time quantum**, then goes to the back of the queue. Good for time-sharing; a tiny quantum means many context switches, a huge quantum behaves like FCFS.

Formulas: **Turnaround = Completion − Arrival**; **Waiting = Turnaround − Burst**. **Preemptive** schedulers can take the CPU away; non-preemptive ones wait until the process finishes or blocks.`,
    keyPoints: ['Turnaround = completion − arrival; Waiting = turnaround − burst', 'SJF is optimal for average waiting time but can starve', 'Round Robin uses a time quantum', 'Aging prevents starvation'],
    questions: [
      Q('A process arrives at t=2, needs 5 units of CPU and completes at t=12. Its waiting time is:', ['5', '10', '3', '7'], 0, 'Turnaround = completion − arrival = 12 − 2 = 10. Waiting = turnaround − burst = 10 − 5 = 5.'),
      Q('Which algorithm can cause the convoy effect?', ['Round Robin', 'FCFS', 'SRTF', 'Multilevel feedback queue'], 1, 'A long job at the front makes all shorter jobs wait.'),
      Q('The technique that gradually raises the priority of waiting processes to prevent starvation is:', ['Paging', 'Aging', 'Swapping', 'Spooling'], 1, 'Aging increases priority with waiting time.'),
      Q('In Round Robin, making the time quantum extremely large makes it behave like:', ['SJF', 'FCFS', 'Priority scheduling', 'Random scheduling'], 1, 'If the quantum exceeds every burst, each process runs to completion in arrival order.')
    ]
  },
  {
    id: 'os-sync-deadlock', subject: 'os', title: 'Synchronization and deadlock', minutes: 16, level: 'Intermediate',
    summary: 'Race conditions, mutexes, semaphores and the four deadlock conditions.',
    body: `A **race condition** occurs when the result depends on the unpredictable order in which threads access shared data (for example two threads doing \`count++\`). The code that touches shared data is the **critical section**; it must run by one thread at a time (**mutual exclusion**).

- **Mutex**: a lock owned by the thread that locked it; only that thread unlocks it.
- **Semaphore**: an integer counter with wait (P) and signal (V). A *binary* semaphore acts like a lock; a *counting* semaphore allows up to N concurrent users of a resource.
- **Monitor**/condition variables: higher-level constructs supported by languages like Java.

**Deadlock** needs all four Coffman conditions: **mutual exclusion, hold and wait, no preemption, circular wait**. Break any one to prevent it (for example, always acquire locks in a fixed global order to prevent circular wait). Strategies: prevention, avoidance (Banker's algorithm), detection and recovery, or ignoring it (the "ostrich" approach many OSes use). **Starvation** is different: a process waits indefinitely although the system keeps running.`,
    keyPoints: ['Race condition = unsynchronized shared access', 'Mutex has an owner; semaphore is a counter', 'Deadlock needs mutual exclusion, hold & wait, no preemption, circular wait', 'Ordering lock acquisition prevents circular wait'],
    questions: [
      Q('Which is NOT one of the four necessary conditions for deadlock?', ['Mutual exclusion', 'Hold and wait', 'Preemption', 'Circular wait'], 2, 'The condition is "no preemption". Being able to preempt resources would break deadlock.'),
      Q('Two threads both execute `counter++` on a shared variable without a lock. This is a:', ['Deadlock', 'Race condition', 'Context switch', 'Page fault'], 1, 'The read-modify-write can interleave and lose an update.'),
      Q('A counting semaphore initialised to 3 allows:', ['One thread at a time', 'Up to three threads at a time', 'Exactly three threads', 'No threads'], 1, 'Each wait decrements; at 0 further threads block.'),
      Q('Acquiring locks in the same fixed order everywhere prevents deadlock by removing:', ['Mutual exclusion', 'Hold and wait', 'Circular wait', 'No preemption'], 2, 'A global order makes a cycle of waiting impossible.')
    ]
  },
  {
    id: 'os-memory', subject: 'os', title: 'Memory management and virtual memory', minutes: 16, level: 'Intermediate',
    summary: 'Paging, page faults, replacement and thrashing.',
    body: `**Paging** splits a process's logical address space into fixed-size **pages** and physical memory into **frames**; a **page table** maps pages to frames. It removes *external* fragmentation but may waste space inside the last page (*internal fragmentation*). **Segmentation** splits by logical units (code, stack, data) and can cause external fragmentation.

**Virtual memory** lets a program use more memory than physically exists by keeping only some pages in RAM (demand paging). Touching a page that is not in RAM causes a **page fault**: the OS loads the page from disk. Faults are slow, so the **TLB** (a small cache of page-table entries) speeds up address translation.

**Page replacement** chooses a victim when RAM is full: **FIFO** (can show Belady's anomaly: more frames, more faults), **LRU** (evict the least recently used; good in practice), **Optimal** (evict the page used farthest in the future; a theoretical benchmark).

**Thrashing**: the system spends more time swapping pages than executing because too many processes compete for too little memory.`,
    keyPoints: ['Paging: fixed pages/frames, page table', 'Page fault = page not in RAM', 'LRU vs FIFO vs Optimal', 'Thrashing = excessive paging'],
    questions: [
      Q('A page fault occurs when:', ['A program divides by zero', 'The needed page is not currently in physical memory', 'The CPU overheats', 'A file is deleted'], 1, 'The OS must bring the page in from disk.'),
      Q('Which page replacement policy evicts the page that has not been used for the longest time?', ['FIFO', 'LRU', 'Optimal', 'Random'], 1, 'LRU = Least Recently Used.'),
      Q('The TLB is:', ['A disk scheduler', 'A cache of recent page-table translations', 'A kind of semaphore', 'A file system'], 1, 'It avoids a memory access to the page table on most translations.'),
      Q('Paging mainly eliminates which problem?', ['Internal fragmentation completely', 'External fragmentation', 'Deadlock', 'Race conditions'], 1, 'Fixed-size frames mean any free frame fits; some internal waste remains in the last page.')
    ]
  },
  // ---------------- CN ----------------
  {
    id: 'cn-models', subject: 'cn', title: 'OSI and TCP/IP models', minutes: 12, level: 'Beginner',
    summary: 'The layered view of networking.',
    body: `The **OSI model** has 7 layers (top to bottom): **Application, Presentation, Session, Transport, Network, Data Link, Physical**. The **TCP/IP model** groups them into 4: Application, Transport, Internet, Link.

What each does:
- **Application**: protocols apps use (HTTP, DNS, SMTP, FTP).
- **Transport**: end-to-end delivery between processes using **ports** (TCP, UDP). Data unit: segment/datagram.
- **Network / Internet**: addressing and routing across networks using **IP addresses**. Data unit: packet. Device: router.
- **Data link**: delivery between neighbouring devices on one network using **MAC addresses**. Data unit: frame. Devices: switch, bridge.
- **Physical**: bits on the wire, radio or fibre. Devices: hub, cable.

Layering lets each layer change independently. Each layer adds its own header as data goes down (**encapsulation**) and strips it going up.`,
    keyPoints: ['OSI 7 layers, TCP/IP 4 layers', 'Transport uses ports; Network uses IP; Data link uses MAC', 'Router = network layer, switch = data link layer', 'Encapsulation adds headers going down'],
    questions: [
      Q('Routing of packets between different networks happens at which OSI layer?', ['Data Link', 'Network', 'Transport', 'Session'], 1, 'The Network layer uses IP addresses and routers.'),
      Q('MAC addresses are used at the:', ['Application layer', 'Transport layer', 'Network layer', 'Data Link layer'], 3, 'MAC addresses identify devices on the local link.'),
      Q('Which layer is responsible for port numbers and end-to-end delivery between processes?', ['Physical', 'Transport', 'Network', 'Presentation'], 1, 'Transport protocols (TCP, UDP) use ports to reach the right application.'),
      Q('A typical switch works at the:', ['Physical layer only', 'Data Link layer', 'Application layer', 'Transport layer'], 1, 'Switches forward frames using MAC addresses.')
    ]
  },
  {
    id: 'cn-tcp-http', subject: 'cn', title: 'TCP, UDP and HTTP', minutes: 15, level: 'Beginner',
    summary: 'Reliable vs fast delivery, and how the web talks.',
    body: `**TCP** is connection-oriented and reliable: it sets up a connection with a **three-way handshake** (SYN, SYN-ACK, ACK), numbers bytes, retransmits lost segments, keeps order and does flow and congestion control. Used for the web, email, file transfer.

**UDP** is connectionless: no handshake, no guarantee of delivery or order, very low overhead. Used when speed matters more than perfection: DNS lookups, video calls, online games, streaming.

**HTTP** is the application protocol of the web (request/response, stateless). Common methods: **GET** (read), **POST** (create/submit), **PUT** (replace), **PATCH** (partial update), **DELETE**. GET and PUT/DELETE are meant to be **idempotent** (repeating them has the same effect as doing it once). Status codes: **2xx** success (200 OK, 201 Created), **3xx** redirect (301, 304), **4xx** client error (400, 401 unauthenticated, 403 forbidden, 404 not found), **5xx** server error (500, 503).

**HTTPS** is HTTP over TLS: encryption, integrity and server authentication via certificates. Cookies and tokens add state on top of stateless HTTP.`,
    keyPoints: ['TCP: handshake, reliable, ordered. UDP: fast, no guarantees', 'HTTP methods and idempotency', 'Status code families 2xx/3xx/4xx/5xx', 'HTTPS = HTTP + TLS'],
    questions: [
      Q('The TCP three-way handshake consists of:', ['SYN, ACK, FIN', 'SYN, SYN-ACK, ACK', 'ACK, ACK, SYN', 'GET, POST, ACK'], 1, 'Client SYN, server SYN-ACK, client ACK.'),
      Q('Which protocol would you choose for a live video call where occasional lost packets are acceptable?', ['TCP', 'UDP', 'FTP', 'SMTP'], 1, 'UDP avoids retransmission delay; a late packet is useless in real time.'),
      Q('HTTP status 404 means:', ['Server crashed', 'Resource not found', 'Not authenticated', 'Moved permanently'], 1, '404 Not Found. A server crash is 5xx; 401 is not authenticated; 301 is a permanent redirect.'),
      Q('Which HTTP method is meant to be idempotent?', ['POST', 'PUT', 'None of them', 'Only GET'], 1, 'PUT (and GET, DELETE) can be repeated safely with the same final result; POST normally cannot.')
    ]
  },
  {
    id: 'cn-dns-ip', subject: 'cn', title: 'DNS, IP addressing, NAT and subnets', minutes: 15, level: 'Intermediate',
    summary: 'How names become addresses and how networks are divided.',
    body: `**DNS** translates names (example.com) into IP addresses. A resolver asks a chain of servers (root → TLD like .com → authoritative) and **caches** answers for a time called **TTL**. Common records: **A** (name → IPv4), **AAAA** (IPv6), **CNAME** (alias), **MX** (mail), **NS** (name servers). DNS mostly uses UDP port 53.

**IPv4** addresses are 32 bits (like 192.168.1.10), **IPv6** are 128 bits. With **CIDR** notation \`/24\` means the first 24 bits identify the network, leaving 8 host bits: 2^8 − 2 = **254 usable hosts** (network and broadcast addresses are reserved). A /30 gives 2 usable hosts.

**Private ranges** (not routable on the internet): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. **NAT** lets many devices on a private network share one public IP by rewriting addresses and ports in the router. **DHCP** hands out IP addresses automatically. **ARP** finds the MAC address for an IP on the local network.`,
    keyPoints: ['DNS: name → IP, cached by TTL', '/24 = 254 usable hosts', 'Private ranges 10/8, 172.16/12, 192.168/16', 'NAT shares one public IP; DHCP assigns addresses; ARP maps IP to MAC'],
    questions: [
      Q('How many usable host addresses does a /26 IPv4 subnet have?', ['64', '62', '30', '126'], 1, '32 − 26 = 6 host bits: 2^6 = 64 addresses, minus network and broadcast = 62.'),
      Q('Which DNS record type maps a name to an IPv4 address?', ['MX', 'CNAME', 'A', 'NS'], 2, 'An A record holds an IPv4 address (AAAA holds IPv6).'),
      Q('Which of these is a private IPv4 address?', ['8.8.8.8', '172.20.4.9', '203.0.113.5', '11.0.0.1'], 1, '172.16.0.0 to 172.31.255.255 is private.'),
      Q('Which protocol automatically assigns IP addresses to devices joining a network?', ['ARP', 'DHCP', 'DNS', 'ICMP'], 1, 'DHCP leases addresses. ARP maps IP to MAC; DNS maps names to IPs.')
    ]
  }
];

// Question ids are derived from the lesson id and position, so they stay stable.
for (const l of LESSONS) l.questions.forEach((q, i) => { q.id = `${l.id}:${i + 1}`; q.lessonId = l.id; q.subject = l.subject; });
const QUESTIONS = LESSONS.flatMap((l) => l.questions);
const lessonById = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
const questionById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

module.exports = { SUBJECTS, LESSONS, QUESTIONS, lessonById, questionById };
