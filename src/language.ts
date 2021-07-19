import {
  Namer,
  Name,
  TypeKind,
  PrimitiveType,
  ClassProperty,
  ObjectType,
  Type,
  panic,
  matchType,
  Sourcelike,
  Option,
  TargetLanguage,
  ConvenienceRenderer,
  RenderContext,
  MapType,
} from "quicktype-core";
import { convertersOption } from 'quicktype-core/dist/support/Converters'
import { StringTypeMapping, getNoStringTypeMapping } from 'quicktype-core/dist/TypeBuilder'
import { utf16StringEscape } from "quicktype-core/dist/support/Strings"
import { funPrefixNamer } from 'quicktype-core/dist/Naming'
import { arrayIntercalate } from 'collection-utils'
import toposort from 'toposort'

export const tsBlazeOptions = {
  converters: convertersOption(),
};

export class TsBlazeTargetLanguage extends TargetLanguage {
  protected getOptions(): Option<any>[] {
      return [tsBlazeOptions.converters];
  }
  // @ts-ignore
  get stringTypeMapping(): StringTypeMapping {
      return getNoStringTypeMapping();
  }
  // @ts-ignore
  get supportsOptionalClassProperties(): boolean {
      return true;
  }
  // @ts-ignore
  get supportsFullObjectType(): boolean {
      return true;
  }
  constructor(
    displayName: string = "TsBlaze",
    names: string[] = ["tsBlaze"],
    extension: string = "tsBlaze"
  ) {
    super(displayName, names, extension);
  }
  protected makeRenderer(renderContext: RenderContext):TsBlazeRenderer {
    return new TsBlazeRenderer(this, renderContext);
  }
}
class TsBlazeRenderer extends ConvenienceRenderer {
  nameStyle(name:string):string { return `is_${name}`.replace(/(\.|_|-|\s)+./g,x => x.slice(-1).toUpperCase()) }
  namerForObjectProperty():Namer { return funPrefixNamer("properties", this.nameStyle) }
  makeUnionMemberNamer():Namer { return funPrefixNamer("union-member", this.nameStyle) }
  makeNamedTypeNamer():Namer { return funPrefixNamer("types", this.nameStyle) }
  makeEnumCaseNamer():Namer { return funPrefixNamer("enum-cases", (s) => s) }
  typeMapTypeFor(t:Type):Sourcelike {
    if (["class", "object", "enum"].indexOf(t.kind) >= 0) {
      return [this.nameForNamedType(t)];
    }

    const match = matchType<Sourcelike>(
      t,
      (_anyType) => "blaze.any()",
      (_nullType) => "blaze.null()",
      (_boolType) => "blaze.boolean()",
      (_integerType) => "blaze.number().satisfies(isInteger)",
      (_doubleType) => "blaze.number()",
      (_stringType) => "blaze.string()",
      (arrayType) => ["blaze.array(", this.typeMapTypeFor(arrayType.items), ")"],
      (_classType) => panic("Should already be handled."),
      (mapType) => ["blaze.record(", this.typeMapTypeFor(mapType.values), ")"],
      (_enumType) => panic("Should already be handled."),
      (unionType) => {
        const children = Array.from(unionType.getChildren()).map((type: Type) =>
          this.typeMapTypeFor(type)
        );
        return ["blaze.oneOf([ ", ...arrayIntercalate(", ", children), " ])"];
      },
      (_transformedStringType) => {
        return `blaze.string().satisfies(${this.nameStyle(_transformedStringType.kind.replace('-','_'))})`;
      }
    );

    return match;
  }
  typeMapTypeForProperty(p: ClassProperty): Sourcelike {
    if (p.isOptional) {
      return ["blaze.optional(", this.typeMapTypeFor(p.type), ")"]
    }
    return this.typeMapTypeFor(p.type);
  }
  private emitObject(name: Name, t: ObjectType) {
    this.ensureBlankLine();
    this.emitLine("export const ", name, " = blaze.object({");
    this.indent(() => {
      this.forEachClassProperty(t, "none", (_, jsonName, property) => {
        this.emitLine(`"${utf16StringEscape(jsonName)}"`, ": ", this.typeMapTypeForProperty(property), ",");
      });
    });
    this.emitLine("});");
  }
  private emitExport(name: Sourcelike, value: Sourcelike): void {
    this.emitLine("export const ", name, " = ", value, ";");
  }
  needsTransformerForType(): boolean {
      return false;
  }
  forEachUniqType = (fn:(t:TypeKind)=>void) => {
    const firstUnionByValue = new Map<TypeKind, boolean>();
    this.forEachType((t) => {
      if (!firstUnionByValue.has(t.kind)) {
        fn(t.kind)
        firstUnionByValue.set(t.kind, true);
      }
    })
  }
  emitSourceStructure() {
    this.emitLine('import * as blaze from "ts-blaze"')
    this.ensureBlankLine()

    const regexps:string[] = []
    const stringFns:string[] = []
    this.forEachUniqType(( kind ) => {
      switch (kind) {
        case 'integer':
          stringFns.push("export const isInteger = (i: number) => i % 1 === 0;")
          break
        case 'date':
          regexps.push("const DATE_REGEXP = /^(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)$/;")
          stringFns.push("export const isDate = DATE_REGEXP.test.bind(DATE_REGEXP);")
          break
        case 'time':
          regexps.push("const TIME_REGEXP = /^(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?(z|[+-]\\d\\d:\\d\\d)?$/i;")
          stringFns.push("export const isTime = TIME_REGEXP.test.bind(TIME_REGEXP);")
          break
        case 'date-time':
          regexps.push("const DATE_TIME_REGEXP = /^(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)(t|\\s)(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?(z|[+-]\\d\\d:\\d\\d)?$/i;")
          stringFns.push("export const isDateTime = DATE_TIME_REGEXP.test.bind(DATE_TIME_REGEXP);")
          break
        case 'bool-string':
          stringFns.push("export const isBoolString = (s) => s === 'true' || s === 'false';")
          break
        case 'uuid':
          regexps.push("const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;")
          stringFns.push("export const isUuid = UUID_REGEXP.test.bind(UUID_REGEXP);")
          break
        case 'uri':
          regexps.push("const URI_REGEXP = /^(https?|ftp):\\/\\/[^{}]+$/;")
          stringFns.push("export const isUri = URI_REGEXP.test.bind(URI_REGEXP);")
          break
        case 'integer-string':
          regexps.push("const INTEGER_STRING_REGEXP = /^(0|-?[1-9]\\d*)$/;")
          stringFns.push("export const isIntegerString = INTEGER_STRING_REGEXP.test.bind(INTEGER_STRING_REGEXP);")
          break
      }
    })
    regexps.forEach((s) => this.emitLine(s))
    this.ensureBlankLine()
    stringFns.forEach((s) => this.emitLine(s))
    this.ensureBlankLine()

    this.forEachEnum("none", (enumType, enumName) => {
      const options: Sourcelike = [];
      this.forEachEnumCase(enumType, "none", (name: Name, _jsonName, _position) => {
        options.push("blaze.string('");
        options.push(name);
        options.push("')");
        options.push(", ");
      });
      options.pop()

      this.emitLine(["export const ", enumName, " = blaze.oneOf([ ", ...options, " ]);"]);
    });

    const mapKey: Name[] = [];
    const mapValue: Sourcelike[][] = [];
    const mapNames = (names?:Name|Name[]):Name[] => names instanceof Name
      ? [ names ]
      : names && names.filter
        ? names.map(mapNames).reduce((acc, val) => acc.concat(val), [])
        : []
    this.forEachObject("none", (type: ObjectType, name: Name) => {
      mapKey.push(name);
      mapValue.push(this.gatherSource(() => this.emitObject(name, type)));
    });
    toposort(
      mapKey.map((_, index) => {
        const source = mapValue[index];
        const names = mapNames(source as Name[]).slice(1)
        return names
          .map((val) => mapKey.findIndex(a => val === a))
          .filter(val => val > -1 && val !== index)
          .map((val):[number,number] => [ index, val ])
      }).reduce<[number,number][]>((acc, val) => acc.concat(val), []).concat([[ -1, 0 ]])
    ).reverse().forEach((i) => i >- 1 && mapValue[i] && this.emitGatheredSource(mapValue[i]))

    // now emit top levels
    this.forEachTopLevel("none", (type, name) => {
      if (type instanceof PrimitiveType) {
        this.emitExport(name, this.typeMapTypeFor(type));
      } else if (type instanceof MapType) {
        this.emitExport(name, ["blaze.record(", this.typeMapTypeFor((type as any).values), ")"]);
      } else if (type.kind === "array") {
        this.emitExport(name, ["blaze.array(", this.typeMapTypeFor((type as any).items), ")"]);
      }
      this.ensureBlankLine()
      this.emitLine("export default ", name, ';');
    });
  }
}

export default TsBlazeTargetLanguage
