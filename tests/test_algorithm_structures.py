"""Execute the tree, graph, backtracking, DP and linked-list Markdown examples."""

from collections import deque
from itertools import permutations
import random
import sys
import unittest

from markdown_examples import load_question


TREE_DOCUMENT = "algorithm/algo_tree_graph.md"
LINKED_DOCUMENT = "algorithm/algo_linked_design.md"


class TreeNode:
    __slots__ = ("val", "left", "right")

    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class ListNode:
    __slots__ = ("val", "next")

    def __init__(self, val, next_node=None):
        self.val = val
        self.next = next_node


def tree_from_level(values):
    """Build fixtures using array positions, without calling example code."""
    nodes = [None if value is None else TreeNode(value) for value in values]
    for index, node in enumerate(nodes):
        if node is not None:
            if 2 * index + 1 < len(nodes):
                node.left = nodes[2 * index + 1]
            if 2 * index + 2 < len(nodes):
                node.right = nodes[2 * index + 2]
    return nodes[0] if nodes else None


def right_chain(length, value_modulus=None):
    root = None
    for value in reversed(range(length)):
        node_value = value if value_modulus is None else value % value_modulus
        root = TreeNode(node_value, right=root)
    return root


def tree_snapshot(root):
    snapshot = {}
    pending = [root] if root else []
    while pending:
        node = pending.pop()
        if node in snapshot:
            raise AssertionError("Tree traversal encountered a cycle or shared node")
        snapshot[node] = (node.val, node.left, node.right)
        if node.left:
            pending.append(node.left)
        if node.right:
            pending.append(node.right)
    return snapshot


def path_levels_oracle(root):
    """Sort root-to-node paths instead of using the examples' BFS queue."""
    paths = []
    pending = [(root, ())] if root else []
    while pending:
        node, path = pending.pop()
        paths.append((path, node.val))
        if node.left:
            pending.append((node.left, path + (0,)))
        if node.right:
            pending.append((node.right, path + (1,)))
    result = []
    for path, value in sorted(paths, key=lambda item: (len(item[0]), item[0])):
        if len(result) <= len(path):
            result.append([])
        result[len(path)].append(value)
    return result


def generated_trees(seed, count):
    rng = random.Random(seed)
    for index in range(count):
        size = index % 18
        if size == 0:
            yield None
            continue
        root = TreeNode(rng.randrange(-20, 21))
        slots = [(root, "left"), (root, "right")]
        for _ in range(size - 1):
            parent, attribute = slots.pop(rng.randrange(len(slots)))
            node = TreeNode(rng.randrange(-20, 21))
            setattr(parent, attribute, node)
            slots.extend(((node, "left"), (node, "right")))
        yield root


def bst_oracle(root):
    """Every left-subtree value must be lower; every right value higher.

    Check every descendant explicitly, independently of both the recursive
    bounds implementation and the iterative inorder implementation.
    """
    pending = [root] if root else []
    while pending:
        node = pending.pop()
        for child, is_left in ((node.left, True), (node.right, False)):
            descendants = [child] if child else []
            while descendants:
                descendant = descendants.pop()
                if is_left and descendant.val >= node.val:
                    return False
                if not is_left and descendant.val <= node.val:
                    return False
                if descendant.left:
                    descendants.append(descendant.left)
                if descendant.right:
                    descendants.append(descendant.right)
            if child:
                pending.append(child)
    return True


def generated_bst_cases():
    rng = random.Random(28)
    for index, root in enumerate(generated_trees(280, 40)):
        if index % 2 == 0:
            # Assign ascending values by inorder position to include valid
            # trees of different shapes, not only randomly invalid trees.
            nodes = []
            stack = []
            current = root
            while current or stack:
                while current:
                    stack.append(current)
                    current = current.left
                current = stack.pop()
                nodes.append(current)
                current = current.right
            for node, value in zip(nodes, sorted(rng.sample(range(-100, 101), len(nodes)))):
                node.val = value
        yield root


def island_oracle(grid):
    """Count disjoint sets, independently of flood-fill traversal."""
    land = {(r, c) for r, row in enumerate(grid) for c, cell in enumerate(row) if cell == "1"}
    parent = {cell: cell for cell in land}

    def find(cell):
        while parent[cell] != cell:
            cell = parent[cell]
        return cell

    for r, c in land:
        for neighbor in ((r + 1, c), (r, c + 1)):
            if neighbor in land:
                parent[find((r, c))] = find(neighbor)
    return len({find(cell) for cell in land})


def course_oracle(size, prerequisites):
    """For tiny graphs, an ordering exists exactly when the graph is acyclic."""
    for ordering in permutations(range(size)):
        position = {course: index for index, course in enumerate(ordering)}
        if all(position[prerequisite] < position[course] for course, prerequisite in prerequisites):
            return True
    return False


def coin_oracle(coins, amount):
    """Shortest path through reachable sums, instead of coin-first DP."""
    queue = deque([(0, 0)])
    seen = {0}
    while queue:
        total, depth = queue.popleft()
        if total == amount:
            return depth
        for coin in coins:
            nxt = total + coin
            if nxt <= amount and nxt not in seen:
                seen.add(nxt)
                queue.append((nxt, depth + 1))
    return -1


TREE_CASES = (
    ([], []),
    ([7], [[7]]),
    ([3, 9, 20, None, None, 15, 7], [[3], [9, 20], [15, 7]]),
    ([1, 2, None, 3, None, None, None, 4], [[1], [2], [3], [4]]),
    ([1, None, 2, None, None, None, 3], [[1], [2], [3]]),
    ([0, -1, 1, -2, None, 0, 2], [[0], [-1, 1], [-2, 0, 2]]),
)


class TestQ26MaxDepth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 26)

    def test_fixed_trees_both_implementations(self):
        for values, levels in TREE_CASES:
            for name in ("maxDepth", "maxDepth_bfs"):
                with self.subTest(values=values, implementation=name):
                    root = tree_from_level(values)
                    before = tree_snapshot(root)
                    self.assertEqual(self.ns[name](root), len(levels))
                    self.assertEqual(tree_snapshot(root), before)

    def test_deterministic_trees_against_path_oracle(self):
        for index, root in enumerate(generated_trees(26, 20)):
            expected = len(path_levels_oracle(root))
            before = tree_snapshot(root)
            for name in ("maxDepth", "maxDepth_bfs"):
                with self.subTest(case=index, implementation=name):
                    self.assertEqual(self.ns[name](root), expected)
                    self.assertEqual(tree_snapshot(root), before)

    def test_bfs_handles_two_thousand_node_chain(self):
        root = right_chain(2000, value_modulus=101)
        before = tree_snapshot(root)
        self.assertEqual(self.ns["maxDepth_bfs"](root), 2000)
        self.assertEqual(tree_snapshot(root), before)


class TestQ27LevelOrder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 27)

    def test_fixed_trees(self):
        for values, levels in TREE_CASES:
            with self.subTest(values=values):
                root = tree_from_level(values)
                before = tree_snapshot(root)
                self.assertEqual(self.ns["levelOrder"](root), levels)
                self.assertEqual(tree_snapshot(root), before)

    def test_deterministic_trees_against_path_oracle(self):
        for index, root in enumerate(generated_trees(27, 20)):
            with self.subTest(case=index):
                expected = path_levels_oracle(root)
                before = tree_snapshot(root)
                self.assertEqual(self.ns["levelOrder"](root), expected)
                self.assertEqual(tree_snapshot(root), before)

    def test_two_thousand_node_chain(self):
        root = right_chain(2000, value_modulus=101)
        before = tree_snapshot(root)
        self.assertEqual(self.ns["levelOrder"](root), [[value % 101] for value in range(2000)])
        self.assertEqual(tree_snapshot(root), before)


class TestQ28ValidBST(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 28)

    def test_fixed_bounds_duplicates_and_extremes(self):
        cases = (
            ([], True),
            ([0], True),
            ([2, 1, 3], True),
            ([5, 1, 4, None, None, 3, 6], False),
            ([5, 1, 8, None, None, 4, 9], False),
            ([2, 2, 3], False),
            ([5, 1, 8, None, None, 5, 9], False),
            ([-2147483648, None, 2147483647], True),
            ([0, -2147483648, 2147483647], True),
        )
        for values, expected in cases:
            for name in ("isValidBST", "isValidBST_iterative"):
                with self.subTest(values=values, implementation=name):
                    root = tree_from_level(values)
                    before = tree_snapshot(root)
                    self.assertIs(self.ns[name](root), expected)
                    self.assertEqual(tree_snapshot(root), before)

    def test_deterministic_trees_against_descendant_oracle(self):
        for index, root in enumerate(generated_bst_cases()):
            expected = bst_oracle(root)
            before = tree_snapshot(root)
            for name in ("isValidBST", "isValidBST_iterative"):
                with self.subTest(case=index, implementation=name):
                    self.assertIs(self.ns[name](root), expected)
                    self.assertEqual(tree_snapshot(root), before)

    def test_iterative_deep_tree_and_ancestor_violation(self):
        valid = right_chain(2000)
        invalid = right_chain(1999)
        tail = invalid
        while tail.right:
            tail = tail.right
        # Locally valid as a left child, but below every right-chain ancestor.
        tail.left = TreeNode(-1)
        for label, root, expected in (("valid", valid, True), ("ancestor violation", invalid, False)):
            with self.subTest(case=label):
                before = tree_snapshot(root)
                self.assertEqual(len(before), 2000)
                self.assertIs(self.ns["isValidBST_iterative"](root), expected)
                self.assertEqual(tree_snapshot(root), before)


class TestQ32Islands(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 32)

    def test_fixed_empty_water_land_and_diagonal_cases(self):
        cases = (
            ([], 0),
            ([[]], 0),
            ([list("0")], 0),
            ([list("1")], 1),
            ([list("10"), list("01")], 2),
            ([list("10101")], 3),
            ([["1"], ["0"], ["1"], ["1"]], 2),
            ([list(row) for row in ("11110", "11010", "11000", "00000")], 1),
            ([list(row) for row in ("11000", "11000", "00100", "00011")], 3),
        )
        for grid, expected in cases:
            with self.subTest(grid=grid):
                self.assertEqual(self.ns["numIslands"]([row[:] for row in grid]), expected)

    def test_deterministic_grids_against_disjoint_set_oracle(self):
        rng = random.Random(32)
        for index in range(32):
            rows, columns = rng.randrange(1, 7), rng.randrange(1, 7)
            grid = [[rng.choice("01") for _ in range(columns)] for _ in range(rows)]
            with self.subTest(case=index, shape=(rows, columns)):
                expected = island_oracle(grid)
                self.assertEqual(self.ns["numIslands"]([row[:] for row in grid]), expected)

    def test_three_hundred_square_single_island_without_raising_recursion_limit(self):
        recursion_limit = sys.getrecursionlimit()
        self.assertLess(recursion_limit, 300 * 300)
        grid = [["1"] * 300 for _ in range(300)]
        self.assertEqual(self.ns["numIslands"](grid), 1)
        self.assertTrue(all(cell == "0" for row in grid for cell in row))
        self.assertEqual(sys.getrecursionlimit(), recursion_limit)


class TestQ34CourseSchedule(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 34)

    def test_fixed_acyclic_cycles_and_disconnected_cases(self):
        cases = (
            (1, [], True),
            (2, [[1, 0]], True),
            (2, [[1, 0], [0, 1]], False),
            (3, [[2, 1], [1, 0]], True),
            (4, [[1, 0], [3, 2]], True),
            (4, [[1, 0], [2, 3], [3, 2]], False),
            (1, [[0, 0]], False),
        )
        for size, edges, expected in cases:
            with self.subTest(size=size, edges=edges):
                before = [edge[:] for edge in edges]
                self.assertIs(self.ns["canFinish"](size, edges), expected)
                self.assertEqual(edges, before)

    def test_deterministic_graphs_against_ordering_oracle(self):
        rng = random.Random(34)
        for size in range(1, 6):
            for index in range(7):
                edges = [[a, b] for a in range(size) for b in range(size) if rng.random() < 0.2]
                with self.subTest(size=size, case=index):
                    expected = course_oracle(size, edges)
                    before = [edge[:] for edge in edges]
                    self.assertIs(self.ns["canFinish"](size, edges), expected)
                    self.assertEqual(edges, before)


class TestQ36Permutations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 36)

    def check_permutations(self, values):
        before = values[:]
        expected = set(permutations(values))
        actual = self.ns["permute"](values)
        self.assertEqual({tuple(row) for row in actual}, expected)
        self.assertEqual(len(actual), len(expected))
        self.assertEqual(len({id(row) for row in actual}), len(actual))
        self.assertEqual(values, before)

    def test_fixed_empty_singleton_and_distinct_values(self):
        for values in ([], [7], [-1, 0], [2, 1, 3]):
            with self.subTest(values=values):
                self.check_permutations(values)

    def test_deterministic_inputs_against_itertools(self):
        rng = random.Random(36)
        for size in range(1, 7):
            for index in range(3):
                values = rng.sample(range(-10, 11), size)
                with self.subTest(size=size, case=index):
                    self.check_permutations(values)


class TestQ46CoinChange(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(TREE_DOCUMENT, 46)

    def test_fixed_zero_unreachable_and_greedy_counterexample(self):
        cases = (
            ([1], 0, 0),
            ([1], 7, 7),
            ([2], 3, -1),
            ([1, 2, 5], 11, 3),
            ([2, 4], 7, -1),
            ([2, 3, 5], 7, 2),
            ([1, 3, 4], 6, 2),
            ([5], 5, 1),
        )
        for coins, amount, expected in cases:
            with self.subTest(coins=coins, amount=amount):
                before = coins[:]
                self.assertEqual(self.ns["coinChange"](coins, amount), expected)
                self.assertEqual(coins, before)

    def test_deterministic_inputs_against_shortest_path_oracle(self):
        rng = random.Random(46)
        for index in range(40):
            coins = rng.sample(range(1, 9), 1 + index % 4)
            amount = index % 21
            with self.subTest(coins=coins, amount=amount):
                before = coins[:]
                self.assertEqual(self.ns["coinChange"](coins, amount), coin_oracle(coins, amount))
                self.assertEqual(coins, before)


class TestQ51ReverseList(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = load_question(LINKED_DOCUMENT, 51)

    def check_reversal(self, name, values):
        nodes = [ListNode(value) for value in values]
        for left, right in zip(nodes, nodes[1:]):
            left.next = right
        result = self.ns[name](nodes[0] if nodes else None)
        expected = list(reversed(nodes))
        actual = []
        seen = set()
        while result is not None:
            self.assertNotIn(result, seen, "The reversed list contains a cycle")
            seen.add(result)
            actual.append(result)
            self.assertLessEqual(len(actual), len(nodes), "Reversal added nodes")
            result = result.next
        self.assertEqual(len(actual), len(expected))
        for actual_node, expected_node in zip(actual, expected):
            self.assertIs(actual_node, expected_node)
        self.assertEqual([node.val for node in actual], list(reversed(values)))
        if nodes:
            self.assertIsNone(nodes[0].next, "The old head must become a detached tail")

    def test_both_named_implementations_boundaries_and_identity(self):
        self.assertIn("reverseList", self.ns)
        self.assertIn("reverseList_recursive", self.ns)
        self.assertIsNot(self.ns["reverseList"], self.ns["reverseList_recursive"])
        for name in ("reverseList", "reverseList_recursive"):
            self.assertEqual(self.ns[name].__name__, name)
            for values in ([], [9], [1, 2], [3, 3, 3], [4, -1, 0, 4], list(range(8))):
                with self.subTest(implementation=name, values=values):
                    self.check_reversal(name, values)

    def test_deterministic_small_lists_against_node_order_oracle(self):
        rng = random.Random(51)
        for index in range(20):
            values = [rng.randrange(-4, 5) for _ in range(index % 16)]
            for name in ("reverseList", "reverseList_recursive"):
                with self.subTest(implementation=name, case=index):
                    self.check_reversal(name, values)

    def test_iterative_two_thousand_nodes(self):
        self.check_reversal("reverseList", list(range(2000)))


if __name__ == "__main__":
    unittest.main()
