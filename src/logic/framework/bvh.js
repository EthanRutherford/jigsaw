export class AABB {
	constructor(mx, my, Mx, My) {
		this.min = {x: mx, y: my};
		this.max = {x: Mx, y: My};
	}
	test(other) {
		if (
			this.max.x < other.min.x || this.min.x > other.max.x ||
			this.max.y < other.min.y || this.min.y > other.max.y
		) {
			return false;
		}

		return true;
	}
	get perimeter() {
		return (this.max.x - this.min.x + this.max.y - this.min.y) * 2;
	}
	combine(other) {
		return new AABB(
			Math.min(this.min.x, other.min.x),
			Math.min(this.min.y, other.min.y),
			Math.max(this.max.x, other.max.x),
			Math.max(this.max.y, other.max.y),
		);
	}
}

class Node {
	constructor(aabb, parent = null, height = 0) {
		this.aabb = aabb;
		this.parent = parent;
		this.children = [];
		this.height = height;
		this.piece = null;
	}
	get isLeaf() {
		return this.children.length === 0;
	}
}

class AABBTree {
	constructor() {
		this.count = 0;
		this.root = null;
	}
	insert(aabb) {
		const node = new Node(aabb);
		this.insertLeaf(node);
		return node;
	}
	remove(node) {
		this.removeLeaf(node);
	}
	query(aabb, callback) {
		const stack = [this.root];
		while (stack.length > 0) {
			const testNode = stack.pop();
			if (testNode == null || testNode.aabb === aabb) {
				continue;
			}
			if (testNode.aabb.test(aabb)) {
				if (testNode.isLeaf) {
					callback(testNode);
				}
				stack.push(testNode.children[0], testNode.children[1]);
			}
		}
	}
	insertLeaf(leaf) {
		this.count++;
		if (this.root === null) {
			this.root = leaf;
			this.root.parent = null;
			return;
		}

		let walk = this.root;
		while (!walk.isLeaf) {
			const perimeter = walk.aabb.perimeter;
			const combinedPerimeter = leaf.aabb.combine(walk.aabb).perimeter;
			const cost = combinedPerimeter * 2;
			const inheritanceCost = 2 * (combinedPerimeter - perimeter);

			let cost0;
			if (walk.children[0].isLeaf) {
				cost0 = leaf.aabb.combine(walk.children[0].aabb).perimeter + inheritanceCost;
			} else {
				const oldArea = walk.children[0].aabb.perimeter;
				const newArea = leaf.aabb.combine(walk.children[0].aabb).perimeter;
				cost0 = (newArea - oldArea) + inheritanceCost;
			}

			let cost1;
			if (walk.children[1].isLeaf) {
				cost1 = leaf.aabb.combine(walk.children[1].aabb).perimeter + inheritanceCost;
			} else {
				const oldArea = walk.children[1].aabb.perimeter;
				const newArea = leaf.aabb.combine(walk.children[1].aabb).perimeter;
				cost1 = (newArea - oldArea) + inheritanceCost;
			}

			if (cost < cost0 && cost < cost1) {
				break;
			}

			if (cost0 < cost1) {
				walk = walk.children[0];
			} else {
				walk = walk.children[1];
			}
		}

		const oldParent = walk.parent;
		const newParent = new Node(leaf.aabb.combine(walk.aabb), oldParent, walk.height + 1);
		if (oldParent != null) {
			if (oldParent.children[0] === walk) {
				oldParent.children[0] = newParent;
			} else {
				oldParent.children[1] = newParent;
			}

			newParent.children.push(walk, leaf);
			walk.parent = newParent;
			leaf.parent = newParent;
		} else {
			newParent.children.push(walk, leaf);
			walk.parent = newParent;
			leaf.parent = newParent;
			this.root = newParent;
		}

		while ((walk = walk.parent)) {
			walk = this.balance(walk);
			walk.height = Math.max(walk.children[0].height, walk.children[1].height) + 1;
			walk.aabb = walk.children[0].aabb.combine(walk.children[1].aabb);
		}
	}
	removeLeaf(leaf) {
		this.count--;
		if (leaf === this.root) {
			this.root = null;
			return;
		}

		const parent = leaf.parent;
		const grandParent = parent.parent;
		const sibling = parent.children[0] === leaf ? parent.children[1] : parent.children[0];

		if (grandParent != null) {
			if (grandParent.children[0] === parent) {
				grandParent.children[0] = sibling;
			} else {
				grandParent.children[1] = sibling;
			}

			sibling.parent = grandParent;

			let walk = parent;
			while ((walk = walk.parent)) {
				walk = this.balance(walk);
				walk.aabb = walk.children[0].aabb.combine(walk.children[1].aabb);
				walk.height = Math.max(walk.children[0].height, walk.children[1].height) + 1;
			}
		} else {
			this.root = sibling;
			sibling.parent = null;
		}
	}
	balance(node) {
		if (node.isLeaf || node.height < 2) {
			return node;
		}

		const a = node;
		const b = node.children[0];
		const c = node.children[1];
		const balance = c.height - b.height;
		if (balance > 1) {
			const f = c.children[0];
			const g = c.children[1];

			c.children[0] = a;
			c.parent = a.parent;
			a.parent = c;

			if (c.parent != null) {
				if (c.parent.children[0] === a) {
					c.parent.children[0] = c;
				} else {
					c.parent.children[1] = c;
				}
			} else {
				this.root = c;
			}

			if (f.height > g.height) {
				c.children[1] = f;
				a.children[1] = g;
				g.parent = a;
				a.aabb = b.aabb.combine(g.aabb);
				c.aabb = a.aabb.combine(f.aabb);
				a.height = Math.max(b.height, g.height) + 1;
				c.height = Math.max(a.height, f.height) + 1;
			} else {
				c.children[1] = g;
				a.children[1] = f;
				f.parent = a;
				a.aabb = b.aabb.combine(f.aabb);
				c.aabb = a.aabb.combine(g.aabb);
				a.height = Math.max(b.height, f.height) + 1;
				c.height = Math.max(a.height, g.height) + 1;
			}
			return c;
		}
		if (balance < -1) {
			const d = b.children[0];
			const e = b.children[1];

			b.children[0] = a;
			b.parent = a.parent;
			a.parent = b;

			if (b.parent != null) {
				if (b.parent.children[0] === a) {
					b.parent.children[0] = b;
				} else {
					b.parent.children[1] = b;
				}
			} else {
				this.root = b;
			}

			if (d.height > e.height) {
				b.children[1] = d;
				a.children[0] = e;
				e.parent = a;
				a.aabb = c.aabb.combine(e.aabb);
				b.aabb = a.aabb.combine(d.aabb);
				a.height = Math.max(c.height, d.height) + 1;
				b.height = Math.max(a.height, e.height) + 1;
			} else {
				b.children[1] = e;
				a.children[0] = d;
				d.parent = a;
				a.aabb = c.aabb.combine(d.aabb);
				b.aabb = a.aabb.combine(e.aabb);
				a.height = Math.max(c.height, d.height) + 1;
				b.height = Math.max(a.height, e.height) + 1;
			}
			return b;
		}
		return a;
	}
	get height() {
		if (this.root == null) {
			return 0;
		}

		return this.root.height;
	}
}

export class BVH {
	constructor() {
		this.tree = new AABBTree();
		this.pieceToNode = {};
	}
	insert(piece) {
		// make the aabb a bit bigger to contain the nubs
		const hw = piece.w * 1.5 / 2;
		const hh = piece.h * 1.5 / 2;
		const aabb = new AABB(piece.x - hw, piece.y - hh, piece.x + hw, piece.y + hh);

		const node = this.tree.insert(aabb);
		node.piece = piece;
		this.pieceToNode[piece.id] = node;

		return this.query(aabb);
	}
	remove(piece) {
		this.tree.remove(this.pieceToNode[piece.id]);
		delete this.pieceToNode[piece.id];
	}
	query(aabb) {
		const contacts = [];
		this.tree.query(aabb, (contact) => contacts.push(contact.piece));
		return contacts;
	}
}
