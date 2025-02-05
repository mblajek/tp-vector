export type Id = string | undefined;
export type Color = string;

/** ColorsDistributor assigns a color to each (abstract) id. */
export interface ColorsDistributor {

  get(id?: Id): Color;

}

/** A ColorsDistributor returning one color for all ids. */
export class ConstColorsDistributor implements ColorsDistributor {

  protected constructor(readonly color: Color) {
  }

  static create(color: Color) {
    return new ConstColorsDistributor(color);
  }

  get(_id?: Id) {
    return this.color;
  }

}

export const ALL_BLACK = ConstColorsDistributor.create("black");

/**
 * A ColorsDistributor returning colors according to a map, or using fallback distributor
 * for missing ids.
 */
export class MapColorsDistributor implements ColorsDistributor {

  protected constructor(
    private readonly colors: ReadonlyMap<Id, Color>,
    private readonly fallback: ColorsDistributor,
  ) {
  }

  static create(colors: Map<Id, Color>, fallback: ColorsDistributor = ALL_BLACK) {
    return new MapColorsDistributor(colors, fallback);
  }

  get(id?: Id) {
    const color = this.colors.get(id);
    if (color !== undefined)
      return color;
    return this.fallback.get(id);
  }

}

export type InitialColorsAssignment = [id: Id, index: number][];

/**
 * A ColorsDistributor assigning colors from a given pool, possibly with some predefined colors.
 * When it runs out of colors, it cycles over the pool again.
 */
export class CyclicColorsDistributor implements ColorsDistributor {

  private usedIndices: Set<number> | undefined = new Set();
  private readonly colors = new Map<Id, Color>();

  protected constructor(
    private readonly pool: Color[],
    initial: InitialColorsAssignment,
    private nextIndex: number,
  ) {
    for (const [id, index] of initial)
      this.setIdIndex(id, index);
  }

  static create({
    pool,
    initial = [],
    nextIndex = 0,
  }: {
    pool: Color[],
    initial?: InitialColorsAssignment,
    nextIndex?: number,
  }) {
    return new CyclicColorsDistributor(pool, initial, nextIndex);
  }

  private setIdIndex(id: Id, index: number) {
    const color = this.pool[index];
    this.colors.set(id, color);
    if (this.usedIndices) {
      this.usedIndices.add(index);
      if (this.usedIndices.size === this.pool.length)
        this.usedIndices = undefined;
    }
    return color;
  }

  private incNextIndex() {
    const res = this.nextIndex;
    this.nextIndex = (this.nextIndex + 1) % this.pool.length;
    return res;
  }

  get(id?: Id) {
    const color = this.colors.get(id);
    if (color !== undefined)
      return color;
    while (this.usedIndices?.has(this.nextIndex))
      this.incNextIndex();
    const index = this.incNextIndex();
    return this.setIdIndex(id, index);
  }

}
